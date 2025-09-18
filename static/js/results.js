(function(){
  const el=(t,c,h)=>{const e=document.createElement(t); if(c) e.className=c; if(h) e.innerHTML=h; return e;};
  const box=document.getElementById("results");
  function read(k){ try{ return JSON.parse(localStorage.getItem(k)||"null"); }catch(e){ return null; } }
  const rxn=read("jsd:rxn"), str=read("jsd:str"), prs=read("jsd:prs"), bal=read("jsd:bal");
  function compute(){ const w={rxn:0.3,str:0.3,prs:0.3,bal:0.1}; let score=0, wsum=0;
    if(rxn){score+=rxn.score*w.rxn; wsum+=w.rxn;}
    if(str){score+=str.score*w.str; wsum+=w.str;}
    if(prs){score+=prs.score*w.prs; wsum+=w.prs;}
    if(bal){score+=bal.score*w.bal; wsum+=w.bal;}
    return Math.round(score/(wsum||1));
  }
  const total=compute();
  const head=el("div","flex items-center gap-2 text-2xl","Score global&nbsp;"); const n=el("span","font-black",String(total)); head.append(n,el("span","","/100")); box.append(head);
  const details=el("div","mt-3 grid gap-2 text-sm");
  if(rxn) details.append(el("div","",`Réaction — Médiane: ${Math.round(rxn.median)} ms · Moyenne: ${Math.round(rxn.mean)} ms · Score ${Math.round(rxn.score)}`));
  if(str) details.append(el("div","",`Stroop — Précision: ${Math.round((str.accuracy||0)*100)}% · RT: ${Math.round(str.mean)} ms · Score ${Math.round(str.score)}`));
  if(prs){ const extra = prs.time_to_catch_ms ? ` · Attrapé en ${Math.round(prs.time_to_catch_ms)} ms` : (prs.mean_error_px? ` · Erreur: ${prs.mean_error_px.toFixed(1)} px` : ""); details.append(el("div","",`Poursuite — Score ${Math.round(prs.score)}${extra}`)); }
  if(bal){
    if(bal.mode==="sensors"){ details.append(el("div","",`Équilibre (capteurs) — σ: ${bal.std_g?.toFixed(3)} g · Score ${Math.round(bal.score)}`)); }
    else if(bal.mode==="touch"){ details.append(el("div","",`Équilibre (tactile) — σ: ${bal.std_px?.toFixed(1)} px · Score ${Math.round(bal.score)}`)); }
  }
  if(!bal && localStorage.getItem("jsd:skip:t4")==="1") details.append(el("div","text-amber-700","Équilibre non mesuré (capteurs indisponibles). Score calculé sur les autres tests."));
  box.append(details);

  const actions=el("div","flex flex-wrap gap-2 mt-4");
  const nick=el("input","px-3 py-2 rounded-xl border bg-white/80 dark:bg-slate-800 dark:border-slate-700",""); nick.placeholder="Surnom (optionnel)"; nick.value=localStorage.getItem("jsd:nick")||""; nick.addEventListener("input",()=>localStorage.setItem("jsd:nick",nick.value));
  const save=el("button","px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700","Enregistrer le score");
  actions.append(nick,save); box.append(actions);

  save.addEventListener("click", async ()=>{
    const payload = { nickname:nick.value||null, total_score: total, rxn, str, prs, bal };
    try{
      const r=await fetch("/api/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const j=await r.json();
      if(j.ok){ save.textContent="Enregistré !"; save.disabled=true; }
    }catch(e){ console.error(e); }
  });
})();