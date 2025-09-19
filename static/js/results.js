(function(){
  const t=(window.i18n)||((key)=>key);
  const el=(tag,cls,html)=>{const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e;};
  const box=document.getElementById('results');
  if(!box) return;

  const session=window.jsdSession;

  function fallbackRead(k){
    try { return JSON.parse(localStorage.getItem(k)||'null'); }
    catch(e){ return null; }
  }

  function fallbackCompute(parts){
    const w={rxn:0.3,str:0.3,prs:0.3,bal:0.1}; let score=0,wsum=0;
    if(parts.rxn && Number.isFinite(parts.rxn.score)){score+=parts.rxn.score*w.rxn; wsum+=w.rxn;}
    if(parts.str && Number.isFinite(parts.str.score)){score+=parts.str.score*w.str; wsum+=w.str;}
    if(parts.prs && Number.isFinite(parts.prs.score)){score+=parts.prs.score*w.prs; wsum+=w.prs;}
    if(parts.bal && Number.isFinite(parts.bal.score)){score+=parts.bal.score*w.bal; wsum+=w.bal;}
    if(wsum<=0) return NaN;
    return score/wsum;
  }

  let rxn=null, str=null, prs=null, bal=null, total=NaN;
  if(session && typeof session.gatherScores==='function'){
    const gathered=session.gatherScores();
    rxn=gathered.rxn;
    str=gathered.str;
    prs=gathered.prs;
    bal=gathered.bal;
    total=gathered.total;
  } else {
    rxn=fallbackRead('jsd:rxn');
    str=fallbackRead('jsd:str');
    prs=fallbackRead('jsd:prs');
    bal=fallbackRead('jsd:bal');
    total=fallbackCompute({rxn,str,prs,bal});
  }

  const formatScore=(value)=>{
    const num=Number(value);
    if(!Number.isFinite(num)){ return "—"; }
    return num.toFixed(1);
  };
  const head=el("div","flex items-center gap-2 text-2xl","");
  head.append(el("span","",t("results.total_label")+" "));
  const n=el("span","font-black",formatScore(total)); head.append(n,el("span","","/100")); box.append(head);
  const summaryMessage=(()=>{
    if(!Number.isFinite(total)) return null;
    if(total < 50){
      return t("results.summary_low");
    }
    if(total < 75){
      return t("results.summary_mid");
    }
    return t("results.summary_high");
  })();
  if(summaryMessage){
    box.append(el("div","mt-3 text-lg font-semibold text-rose-700 dark:text-rose-300",summaryMessage));
  }

  const details=el("div","mt-3 grid gap-2 text-sm");
  if(rxn) details.append(el("div","",t("results.reaction_detail",{median:Math.round(rxn.median), mean:Math.round(rxn.mean), score:formatScore(rxn.score)})));
  if(str) details.append(el("div","",t("results.stroop_detail",{accuracy:Math.round((str.accuracy||0)*100), rt:Math.round(str.mean), score:formatScore(str.score)})));
  if(prs){
    if(prs.time_to_catch_ms){
      details.append(el("div","",t("results.pursuit_detail_time",{score:formatScore(prs.score), time:Math.round(prs.time_to_catch_ms)})));
    } else if(prs.mean_error_px){
      details.append(el("div","",t("results.pursuit_detail_mean",{score:formatScore(prs.score), error:prs.mean_error_px.toFixed(1)})));
    } else {
      details.append(el("div","",t("results.pursuit_detail_base",{score:formatScore(prs.score)})));
    }
  }
  if(bal){
    if(bal.mode==="sensors"){ details.append(el("div","",t("results.balance_sensors_detail",{std:(bal.std_g?.toFixed(3)??"0"), score:formatScore(bal.score)}))); }
    else if(bal.mode==="touch"){ details.append(el("div","",t("results.balance_touch_detail",{std:(bal.std_px?.toFixed(1)??"0"), score:formatScore(bal.score)}))); }
  }
  if(!bal && localStorage.getItem("jsd:skip:t4")==="1") details.append(el("div","text-amber-700",t("results.balance_skipped")));
  box.append(details);

  const actions=el('div','flex flex-wrap gap-2 mt-4 items-center');
  const nickname=(localStorage.getItem('jsd:nick')||'').trim();
  const stateBadge=el('div','');
  const baseBadgeClasses='px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200';

  function messageForState(state){
    if(state==='1'){
      return nickname ? t('results.auto_saved_with',{nickname}) : t('results.auto_saved');
    }
    if(state==='pending'){
      return t('results.auto_saving');
    }
    if(state==='0'){
      return t('results.auto_save_retry');
    }
    return t('results.auto_save_preparing');
  }

  function applyState(state){
    stateBadge.className = `${baseBadgeClasses} ${state==='1' ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
      : state==='0' ? 'bg-rose-100/80 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
      : 'bg-amber-100/80 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'}`;
    stateBadge.textContent = messageForState(state);
  }

  const initialState = session && typeof session.submissionState==='function' ? session.submissionState() : null;
  applyState(initialState);

  const share=el('button','px-4 py-2 rounded-xl border border-rose-500 text-rose-600 hover:bg-rose-50 dark:border-rose-400 dark:text-rose-200 dark:hover:bg-slate-800',t('results.share_button'));
  actions.append(stateBadge, share); box.append(actions);

  if(session && typeof session.submitScore==='function'){
    session.submitScore().then(()=>{
      applyState(session.submissionState ? session.submissionState() : '1');
    }).catch(()=>{
      applyState('0');
    });
  }

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
