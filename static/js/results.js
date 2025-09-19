(function(){
  const t=(window.i18n)||((key)=>key);
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
  const head=el("div","flex items-center gap-2 text-2xl","");
  head.append(el("span","",t("results.total_label")+" "));
  const n=el("span","font-black",String(total)); head.append(n,el("span","","/100")); box.append(head);
  const details=el("div","mt-3 grid gap-2 text-sm");
  if(rxn) details.append(el("div","",t("results.reaction_detail",{median:Math.round(rxn.median), mean:Math.round(rxn.mean), score:Math.round(rxn.score)})));
  if(str) details.append(el("div","",t("results.stroop_detail",{accuracy:Math.round((str.accuracy||0)*100), rt:Math.round(str.mean), score:Math.round(str.score)})));
  if(prs){
    if(prs.time_to_catch_ms){
      details.append(el("div","",t("results.pursuit_detail_time",{score:Math.round(prs.score), time:Math.round(prs.time_to_catch_ms)})));
    } else if(prs.mean_error_px){
      details.append(el("div","",t("results.pursuit_detail_mean",{score:Math.round(prs.score), error:prs.mean_error_px.toFixed(1)})));
    } else {
      details.append(el("div","",t("results.pursuit_detail_base",{score:Math.round(prs.score)})));
    }
  }
  if(bal){
    if(bal.mode==="sensors"){ details.append(el("div","",t("results.balance_sensors_detail",{std:(bal.std_g?.toFixed(3)??"0"), score:Math.round(bal.score)}))); }
    else if(bal.mode==="touch"){ details.append(el("div","",t("results.balance_touch_detail",{std:(bal.std_px?.toFixed(1)??"0"), score:Math.round(bal.score)}))); }
  }
  if(!bal && localStorage.getItem("jsd:skip:t4")==="1") details.append(el("div","text-amber-700",t("results.balance_skipped")));
  box.append(details);

  const actions=el("div","flex flex-wrap gap-2 mt-4");
  const nick=el("input","px-3 py-2 rounded-xl border bg-white/80 dark:bg-slate-800 dark:border-slate-700",""); nick.placeholder=t("results.nickname_placeholder"); nick.value=localStorage.getItem("jsd:nick")||""; nick.addEventListener("input",()=>localStorage.setItem("jsd:nick",nick.value));
  const save=el("button","px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700",t("results.save_button"));
  const share=el("button","px-4 py-2 rounded-xl border border-rose-500 text-rose-600 hover:bg-rose-50 dark:border-rose-400 dark:text-rose-200 dark:hover:bg-slate-800",t("results.share_button"));
  actions.append(nick,save,share); box.append(actions);

  save.addEventListener("click", async ()=>{
    const payload = { nickname:nick.value||null, total_score: total, rxn, str, prs, bal };
    try{
      const r=await fetch("/api/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const j=await r.json();
      if(j.ok){ save.textContent=t("results.save_success"); save.disabled=true; }
    }catch(e){ console.error(e); }
  });

  share.addEventListener("click", async ()=>{
    const message=t("results.share_message",{score:`${total}/100`});
    const reset=()=>{ share.disabled=false; share.textContent=t("results.share_button"); };
    share.disabled=true;
    try{
      if(navigator.share){
        await navigator.share({text:message});
        share.textContent=t("results.share_success");
      } else if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(message);
        share.textContent=t("results.share_copied");
      } else {
        const ta=document.createElement("textarea");
        ta.value=message;
        ta.setAttribute("readonly","");
        ta.style.position="absolute";
        ta.style.left="-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        share.textContent=t("results.share_copied");
      }
      setTimeout(reset,2500);
    }catch(e){
      if(e && e.name==="AbortError"){ reset(); return; }
      console.error(e);
      share.textContent=t("results.share_error");
      setTimeout(reset,2500);
    }
  });
})();
