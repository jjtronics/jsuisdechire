(function(){
  const t=(window.i18n)||((key)=>key);
  const el=(tag,cls,html)=>{const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e;};
  const box=document.getElementById('results');
  if(!box) return;

  const session=window.jsdSession;
  const sanitizeNickname = session && typeof session.sanitizeNickname==='function'
    ? session.sanitizeNickname
    : (value)=> (value || '').trim();

  function fallbackRead(k){
    try { return JSON.parse(localStorage.getItem(k)||'null'); }
    catch(e){ return null; }
  }

  function fallbackCompute(parts){
    if(parts && parts.bal && parts.bal.cheat && parts.bal.cheat.detected){
      return -42;
    }
    const w={rxn:0.2,str:0.2,prs:0.2,rfl:0.15,mem:0.15,bal:0.1}; let score=0,wsum=0;
    if(parts.rxn && Number.isFinite(parts.rxn.score)){score+=parts.rxn.score*w.rxn; wsum+=w.rxn;}
    if(parts.str && Number.isFinite(parts.str.score)){score+=parts.str.score*w.str; wsum+=w.str;}
    if(parts.prs && Number.isFinite(parts.prs.score)){score+=parts.prs.score*w.prs; wsum+=w.prs;}
    if(parts.rfl && Number.isFinite(parts.rfl.score)){score+=parts.rfl.score*w.rfl; wsum+=w.rfl;}
    if(parts.mem && Number.isFinite(parts.mem.score)){score+=parts.mem.score*w.mem; wsum+=w.mem;}
    if(parts.bal && Number.isFinite(parts.bal.score)){score+=parts.bal.score*w.bal; wsum+=w.bal;}
    if(wsum<=0) return NaN;
    return score/wsum;
  }

  let rxn=null, str=null, prs=null, rfl=null, mem=null, bal=null, total=NaN;
  if(session && typeof session.gatherScores==='function'){
    const gathered=session.gatherScores();
    rxn=gathered.rxn;
    str=gathered.str;
    prs=gathered.prs;
    rfl=gathered.rfl;
    mem=gathered.mem;
    bal=gathered.bal;
    total=gathered.total;
  } else {
    rxn=fallbackRead('jsd:rxn');
    str=fallbackRead('jsd:str');
    prs=fallbackRead('jsd:prs');
    rfl=fallbackRead('jsd:rfl');
    mem=fallbackRead('jsd:mem');
    bal=fallbackRead('jsd:bal');
    total=fallbackCompute({rxn,str,prs,rfl,mem,bal});
  }

  const cheatDetected=!!(bal && bal.cheat && bal.cheat.detected);
  const cheatInfo=cheatDetected ? bal.cheat || {} : null;

  const normalizedTotal=Number.isFinite(total)?Math.trunc(total):null;

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
    if(cheatDetected && normalizedTotal===-42){
      return t("results.summary_cheater");
    }
    const tiers=[
      {limit:10, key:"results.summary_tier0"},
      {limit:20, key:"results.summary_tier1"},
      {limit:30, key:"results.summary_tier2"},
      {limit:40, key:"results.summary_tier3"},
      {limit:50, key:"results.summary_low"},
      {limit:60, key:"results.summary_tier5"},
      {limit:70, key:"results.summary_tier6"},
      {limit:80, key:"results.summary_mid"},
      {limit:90, key:"results.summary_tier8"},
      {limit:Infinity, key:"results.summary_high"},
    ];
    for(const tier of tiers){
      if(total < tier.limit){
        return t(tier.key);
      }
    }
    return null;
  })();
  if(summaryMessage){
    box.append(el("div","mt-3 text-lg font-semibold text-rose-700 dark:text-rose-300",summaryMessage));
  }

  if(cheatDetected){
    const stdValue = Number(cheatInfo && cheatInfo.std_g);
    const thrValue = Number(cheatInfo && cheatInfo.threshold);
    const stdLabel = Number.isFinite(stdValue) ? stdValue.toFixed(3) : '—';
    const thrLabel = Number.isFinite(thrValue) ? thrValue.toFixed(3) : '—';
    box.append(el("div","mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300",t("results.balance_cheat_detected",{std:stdLabel,threshold:thrLabel})));
  }

  const placementBox=el("div","mt-3 text-lg font-semibold text-rose-700 dark:text-rose-300");
  placementBox.style.display='none';
  box.append(placementBox);

  function matchesCurrentTotal(info){
    if(!info || normalizedTotal==null) return false;
    const storedTotal=Number(info.total_score);
    return Number.isFinite(storedTotal) && storedTotal===normalizedTotal;
  }

  function showPlacement(info){
    if(!info) return;
    const rankNum=Number(info.rank);
    const totalNum=Number(info.total_entries ?? info.total);
    if(!Number.isFinite(rankNum) || rankNum<=0) return;
    if(!Number.isFinite(totalNum) || totalNum<=0) return;
    placementBox.textContent=t('results.rank_message',{rank:rankNum,total:totalNum});
    placementBox.style.display='block';
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
  if(rfl){
    const hits = Number(rfl.hits);
    const attempts = Number(rfl.attempts);
    const best = Number(rfl.best_error_px);
    const avg = Number(rfl.avg_error_px);
    const hitsLabel = Number.isFinite(hits) ? Math.max(0, Math.trunc(hits)) : 0;
    const attemptsLabel = Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) : 0;
    const bestLabel = Number.isFinite(best) ? `${best.toFixed(best >= 100 ? 0 : 1)} px` : '—';
    const avgLabel = Number.isFinite(avg) ? `${avg.toFixed(avg >= 100 ? 0 : 1)} px` : '—';
    details.append(el("div","",t("results.reflex_detail",{
      score: formatScore(rfl.score),
      hits: hitsLabel,
      attempts: attemptsLabel,
      best: bestLabel,
      avg: avgLabel
    })));
  }
  if(mem){
    const mistakes = Number(mem.mistakes);
    const elapsed = Number(mem.elapsed_ms);
    const pairs = Number(mem.pairs);
    const seconds = Number.isFinite(elapsed) ? Math.round(elapsed/1000) : null;
    const timeLabel = seconds!=null ? `${seconds}s` : '—';
    details.append(el("div","",t("results.memory_detail",{
      score:formatScore(mem.score),
      mistakes:Number.isFinite(mistakes)?mistakes:0,
      time:timeLabel,
      pairs:Number.isFinite(pairs)?pairs:"—"
    })));
  }
  if(bal){
    if(bal.mode==="sensors"){ details.append(el("div","",t("results.balance_sensors_detail",{std:(bal.std_g?.toFixed(3)??"0"), score:formatScore(bal.score)}))); }
    else if(bal.mode==="touch"){ details.append(el("div","",t("results.balance_touch_detail",{std:(bal.std_px?.toFixed(1)??"0"), score:formatScore(bal.score)}))); }
  }
  if(!bal && localStorage.getItem("jsd:skip:t4")==="1") details.append(el("div","text-amber-700",t("results.balance_skipped")));
  box.append(details);

  const actions=el('div','flex flex-wrap gap-2 mt-4 items-center');
  const nickname=sanitizeNickname(localStorage.getItem('jsd:nick'));
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

  if(initialState==='1' && session && typeof session.getLastSubmissionInfo==='function'){
    const cachedInfo=session.getLastSubmissionInfo();
    if(matchesCurrentTotal(cachedInfo)){
      showPlacement(cachedInfo);
    }
  }

  const share=el('button','px-4 py-2 rounded-xl border border-rose-500 text-rose-600 hover:bg-rose-50 dark:border-rose-400 dark:text-rose-200 dark:hover:bg-slate-800',t('results.share_button'));
  const restart=el('button','px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400',t('results.restart_button'));
  const leaderboard=el('button','text-sm px-3 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700',t('results.scores_button'));
  actions.append(stateBadge, share, restart, leaderboard); box.append(actions);

  if(session && typeof session.submitScore==='function'){
    session.submitScore().then((result)=>{
      let customErrorMessage=null;
      if(result){
        if(result.status==='ok' && matchesCurrentTotal(result.saved)){
          showPlacement(result.saved);
        } else if(result.status==='already' && matchesCurrentTotal(result.cached)){
          showPlacement(result.cached);
        } else if(result.status==='ok' && result.response){
          const fallbackInfo={
            rank:result.response.rank,
            total_entries:result.response.total_entries,
            total_score:normalizedTotal
          };
          if(matchesCurrentTotal(fallbackInfo)){
            showPlacement(fallbackInfo);
          }
        } else if(result.status==='error' && result.response){
          if(result.response.error==='nickname_reserved'){
            customErrorMessage="Ton surnom est vérifié par un autre joueur. Connecte-toi pour enregistrer le score.";
          } else if(result.response.error==='missing_nickname'){
            customErrorMessage="Choisis un surnom pour sauvegarder ton score.";
          }
        }
      }
      const nextState=session.submissionState ? session.submissionState() : '1';
      applyState(nextState);
      if(customErrorMessage){
        stateBadge.className=`${baseBadgeClasses} bg-rose-100/80 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200`;
        stateBadge.textContent=customErrorMessage;
      }
    }).catch(()=>{
      applyState('0');
    });
  }

  share.addEventListener("click", async ()=>{
    const roundedTotal = Number.isFinite(total) ? total.toFixed(1) : "—";
    const message=t("results.share_message",{score:`${roundedTotal}/100`});
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

  restart.addEventListener("click",()=>{
    restart.disabled=true;
    try{
      if(session && typeof session.resetProgress==='function'){
        session.resetProgress({keepNickname:true});
      } else {
        ['jsd:done:t1','jsd:done:t2','jsd:done:t3','jsd:done:t4','jsd:done:t5','jsd:done:t6','jsd:skip:t4','jsd:rxn','jsd:str','jsd:prs','jsd:rfl','jsd:mem','jsd:bal','jsd:score_submitted','jsd:last_submission']
          .forEach(key=>localStorage.removeItem(key));
      }
    }catch(err){
      console.error(err);
    }
    window.location.href='/t1';
  });

  leaderboard.addEventListener('click',()=>{
    window.location.href='/leaderboard';
  });
})();
