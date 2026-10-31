# MarketSense AI — cultural intelligence for founders

**Live demo:** https://marketsense-ai.floot.app  
**Devpost entry:** https://devpost.com/software/marketsense-ai-gxshzr

MarketSense AI explores startup hypotheses using Qloo cultural signals. It first finds a real Qloo taste tag through `/v2/tags`, then queries `/v2/insights` for places conditioned on that tag and target city. The user sees retrieved results and reversible validation experiments; no synthetic results are passed off as Qloo evidence.

## Architecture

- `pages/_index.tsx` — React interface and request client.
- `endpoints/analyze_POST.ts` — server-side Zod validation, Qloo API requests, evidence normalization and experiments.
- `base.css` — original responsive styling from the Floot project.
- `.env.example` — safe example; **do not commit API secrets**.
- `LICENSE` — MIT.

## Running

This is the **custom project source from Floot**, not an independently bootstrappable Vite/Next.js project. Import the files into a compatible Floot React project, install `zod`, connect the `QLOO_API_KEY` environment variable as a backend-only secret, and publish. Floot maps `endpoints/analyze_POST.ts` to `POST /_api/analyze`.

Try an idea, city, audience and taste cue such as `coffee`. The backend calls `https://hackathon.api.qloo.com/v2/tags` and then `https://hackathon.api.qloo.com/v2/insights`. It requires an authentic API key; if missing it returns HTTP 503 and does not invent results.

## Important current limitations

- A successful end-to-end Qloo API interaction **has not been independently verified**; the API credential was not connected when the project was last checked.
- Aggregate cultural affinities do not prove purchase intent, market demand or causation.
- The audience is a research hypothesis, not a verified Qloo demographic filter.
- No user accounts or persistent customer data; do not submit sensitive customer information.
- Hosted Floot runtime is needed; this repository contains **custom application source**, not Floot's platform implementation.
