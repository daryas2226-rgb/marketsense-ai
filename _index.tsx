import React, { useState } from "react";
type Candidate={id:string;name:string;type:string;rank:number;affinity:number|null};
type Report={error?:string;summary?:string;live?:boolean;tag?:{name:string;id:string};entities?:Candidate[];actions?:string[];toolTrace?:string[];disclaimer?:string};
export default function Home() {
  const [concept,setConcept]=useState("A specialty coffee shop with a book and music corner");
  const [city,setCity]=useState("Almaty");
  const [audience,setAudience]=useState("Young professionals and university students");
  const [taste,setTaste]=useState("coffee");
  const [result,setResult]=useState<Report|null>(null);
  const [loading,setLoading]=useState(false);
  async function analyze(){
    setLoading(true);setResult(null);
    try{
      const r=await fetch("/_api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({concept,city,audience,taste})});
      const data:Report=await r.json();setResult(data);
    }catch{setResult({error:"Could not connect to the analysis endpoint. Please retry."})}
    finally{setLoading(false)}
  }
  return <main className="shell">
    <header><div className="brand"><span className="logo">✦</span> MarketSense <b>AI</b></div><span className="toplabel">QLOO CULTURAL INTELLIGENCE · LIVE SOURCES</span></header>
    <section className="hero"><div className="eyebrow">TASTE-CONDITIONED MARKET DISCOVERY</div><h1>Build what people<br/><em>actually love.</em></h1><p>A guided research agent for early-stage founders. It resolves a real Qloo taste tag, asks Qloo for city-level place affinities, then proposes experiments to validate the business idea.</p></section>
    <section className="workspace">
      <div className="form"><div className="sectionlabel">01 / YOUR STARTUP HYPOTHESIS</div><h2>Explore a cultural opportunity</h2>
        <label>Business idea<textarea value={concept} onChange={e=>setConcept(e.target.value)} rows={3} maxLength={500}/></label>
        <div className="twocol"><label>Target city<input value={city} onChange={e=>setCity(e.target.value)} maxLength={100}/></label><label>Audience hypothesis<input value={audience} onChange={e=>setAudience(e.target.value)} maxLength={200}/></label></div>
        <label>Qloo taste cue <span className="hint">(a concrete interest to test)</span><input value={taste} onChange={e=>setTaste(e.target.value)} maxLength={60} placeholder="coffee, jazz, hiking, books"/></label>
        <button disabled={loading || !concept.trim() || !city.trim() || !taste.trim()} onClick={analyze}>{loading?"Resolving taste signals…":"Run live Qloo discovery →"}</button>
        <div className="privacy">No invented data · No personal data sent to Qloo · API key kept on server</div>
      </div>
      <div className="results"><div className="sectionlabel">02 / QLOO-GROUNDED EVIDENCE</div>
        {!result?<div className="empty"><div className="orbit">◎</div><h3>Discover local affinities</h3><p>Enter a taste cue and run a live Qloo lookup. We will show what was actually returned, including empty or unavailable results.</p></div>:
        result.error?<div className="notice" role="alert"><h3>Live analysis unavailable</h3><p>{result.error}</p><p className="footnote">No sample results are substituted when Qloo cannot respond.</p></div>:
        <div className="report"><div className="livepill">● LIVE QLOO QUERY</div><h2>Market intelligence report</h2><p>{result.summary}</p>
          {result.tag&&<p className="evidence"><strong>Resolved taste signal:</strong> {result.tag.name}<small>{result.tag.id}</small></p>}
          <div className="chips">{(result.entities||[]).map((x,i)=><article className="chip" key={x.id+"-"+i}><span className="rank">#{x.rank}</span><strong>{x.name}</strong><small>{x.type}</small>{typeof x.affinity==="number"&&<small>API affinity: {x.affinity.toFixed(3)} (not purchase probability)</small>}</article>)}</div>
          <h3>Suggested experiments <span className="hint">(hypotheses, not Qloo facts)</span></h3><ol>{(result.actions||[]).map((x,i)=><li key={i}>{x}</li>)}</ol>
          <details className="trace"><summary>How the agent used Qloo</summary><ol>{(result.toolTrace||[]).map((x,i)=><li key={i}>{x}</li>)}</ol></details>
          <p className="footnote">{result.disclaimer||"Taste insights are exploratory research signals."}</p>
        </div>}
      </div>
    </section>
    <footer>MARKETSENSE AI · CULTURE MEETS COMMERCE · 2026</footer>
  </main>
}
