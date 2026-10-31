import { z } from "zod";
const Input = z.object({
  concept: z.string().trim().min(3).max(500),
  city: z.string().trim().min(2).max(100),
  audience: z.string().trim().min(2).max(200),
  taste: z.string().trim().min(2).max(60),
});
type Dict = Record<string, any>;
const headers = (key: string) => ({ "X-Api-Key": key, Accept: "application/json" });
function cleanText(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function resultArray(p: Dict, kind: string): Dict[] {
  const raw = p?.results?.[kind] ?? p?.results ?? p?.[kind] ?? [];
  return Array.isArray(raw) ? raw : [];
}
function tagCode(t: Dict): string {
  const c = [t?.tag_id, t?.tagId, t?.id, t?.urn, t?.tag?.id, t?.tag?.urn];
  return c.map(cleanText).find(x => x.startsWith("urn:tag:")) ?? "";
}
function tagName(t: Dict): string {
  return cleanText(t?.name) || cleanText(t?.label) || cleanText(t?.properties?.name) || cleanText(t?.tag?.name);
}
async function qloo(path: string, query: URLSearchParams, key: string): Promise<Dict> {
  const response = await fetch("https://hackathon.api.qloo.com" + path + "?" + query.toString(), {
    method: "GET", headers: headers(key), signal: AbortSignal.timeout(16000),
  });
  if (!response.ok) throw new Error("Qloo API error (" + response.status + "). Please try a different taste cue or city.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Unexpected Qloo response.");
  return body as Dict;
}
function items(p: Dict): Dict[] {
  return resultArray(p, "entities").slice(0, 10).flatMap((item: Dict, i: number) => {
    const name = cleanText(item?.name) || cleanText(item?.properties?.name) || cleanText(item?.properties?.title);
    if (!name) return [];
    const value = item?.query?.affinity;
    const score = typeof value === "number" ? value : typeof value?.score === "number" ? value.score : null;
    return [{
      id: cleanText(item?.entity_id) || cleanText(item?.id) || "qloo-rank-" + (i+1),
      name, type: cleanText(item?.type) || cleanText(item?.subtype) || "place",
      rank: i+1, affinity: score,
    }];
  });
}
function fail(msg: string, status = 502) {
  return Response.json({ error: msg, live: false }, { status, headers: { "Cache-Control": "no-store" } });
}
// Constrained agent: resolve real Qloo tag, fetch taste-conditioned places,
// then propose reversible experiments. Do not fabricate Qloo results.
export async function handle(request: Request) {
  let input: z.infer<typeof Input>;
  try { input = Input.parse(await request.json()); }
  catch { return fail("Enter a business concept, city, audience and cultural taste cue.", 400); }
  const key = (process.env as Record<string, string | undefined>)["QLOO_API_KEY"];
  if (!key) return Response.json({
    error: "Qloo API credential is not connected. Connect QLOO_API_KEY securely in Floot.",
    live: false,
  }, { status: 503 });
  const cue = input.taste.replace(/[^\p{L}\p{N} -]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!cue) return fail("Provide a meaningful taste cue, such as coffee, jazz or hiking.", 400);
  try {
    const tagsPayload = await qloo("/v2/tags", new URLSearchParams({ "filter.query": cue, take: "8" }), key);
    const candidates = resultArray(tagsPayload, "tags")
      .map(t => ({ id: tagCode(t), name: tagName(t) }))
      .filter(t => t.id && t.name);
    const exact = candidates.find(t => t.name.toLocaleLowerCase() === cue.toLocaleLowerCase());
    const chosen = exact ?? candidates.find(t => t.name.toLocaleLowerCase().includes(cue.toLocaleLowerCase()) || (t.name.length > 3 && cue.toLocaleLowerCase().includes(t.name.toLocaleLowerCase())));
    if (!chosen) return Response.json({
      error: "Qloo found no usable tag matching this taste cue. Try a narrower term such as coffee, jazz, books or hiking.",
      live: true, toolTrace: ["Qloo /v2/tags: no usable match"],
    }, { status: 422 });
    const params = new URLSearchParams({
      "filter.type": "urn:entity:place",
      "filter.location.query": input.city,
      "signal.interests.tags": chosen.id,
      "feature.explainability": "true",
      take: "10",
    });
    const recommendations = await qloo("/v2/insights", params, key);
    const entities = items(recommendations);
    const named = entities.slice(0, 3).map(x => x.name);
    const experiments = entities.length ? [
      "Interview 10 " + input.audience.toLowerCase() + " in " + input.city + " about the overlap with " + chosen.name + " and actual purchase intent.",
      "Test a small partnership or event with a venue from the Qloo result set" + (named[0] ? " (research candidate: " + named[0] + ")" : "") + "; check permission, cost and fit before outreach.",
      "Compare two landing-page positioning concepts for " + input.concept + ": one highlighting " + chosen.name + " and one category-neutral; measure signup conversion.",
      "Validate business hours, suitability and pricing directly: taste-affinity alone is not evidence of availability or revenue.",
    ] : [
      "Broaden the city or choose a clearer cultural taste cue.",
      "Interview at least 10 prospective customers to validate whether the taste cue matters.",
      "Check Qloo's coverage and query filters; a zero-result query is not proof of zero demand.",
    ];
    return Response.json({
      live: true,
      summary: entities.length
        ? "Qloo matched the taste cue ‘" + cue + "’ to its tag ‘" + chosen.name + "’ and returned " + entities.length + " place candidates around " + input.city + ". These are taste-conditioned discovery signals, not consumer demand forecasts."
        : "Qloo recognized the taste cue ‘" + chosen.name + "’, but returned no place candidates in " + input.city + ".",
      tag: chosen, entities, actions: experiments,
      toolTrace: [
        "1. Qloo /v2/tags: resolved ‘" + cue + "’ → " + chosen.id,
        "2. Qloo /v2/insights: filtered places in " + input.city + " conditioned on that tag",
        "3. Evidence review: ranked " + entities.length + " returned entities and drafted validation experiments",
      ],
      disclaimer: "Recommendations are exploratory aggregate affinity signals. They do not prove individual preferences, causal impact or purchase intent.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fail(e instanceof Error && e.name === "TimeoutError" ? "Qloo request timed out. Try again." : e instanceof Error ? e.message : "Unable to complete Qloo analysis.");
  }
}
