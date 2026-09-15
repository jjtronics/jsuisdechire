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
    const w={rxn:0.18,str:0.18,prs:0.18,rfl:0.12,pong:0.10,drv:0.12,mem:0.12,bal:0.1,ice:0.10,tilt:0.10,dino:0.10}; let score=0,wsum=0;
    if(parts.rxn && Number.isFinite(parts.rxn.score)){score+=parts.rxn.score*w.rxn; wsum+=w.rxn;}
    if(parts.str && Number.isFinite(parts.str.score)){score+=parts.str.score*w.str; wsum+=w.str;}
    if(parts.prs && Number.isFinite(parts.prs.score)){score+=parts.prs.score*w.prs; wsum+=w.prs;}
    if(parts.rfl && Number.isFinite(parts.rfl.score)){score+=parts.rfl.score*w.rfl; wsum+=w.rfl;}
    if(parts.pong && Number.isFinite(parts.pong.score)){score+=parts.pong.score*w.pong; wsum+=w.pong;}
    if(parts.drv && Number.isFinite(parts.drv.score)){score+=parts.drv.score*w.drv; wsum+=w.drv;}
    if(parts.mem && Number.isFinite(parts.mem.score)){score+=parts.mem.score*w.mem; wsum+=w.mem;}
    if(parts.bal && Number.isFinite(parts.bal.score)){score+=parts.bal.score*w.bal; wsum+=w.bal;}
    if(parts.ice && Number.isFinite(parts.ice.score)){score+=parts.ice.score*w.ice; wsum+=w.ice;}
    if(parts.tilt && Number.isFinite(parts.tilt.score)){score+=parts.tilt.score*w.tilt; wsum+=w.tilt;}
    if(parts.dino && Number.isFinite(parts.dino.score)){score+=parts.dino.score*w.dino; wsum+=w.dino;}
    if(wsum<=0) return NaN;
    return score/wsum;
  }

  let rxn=null, str=null, prs=null, rfl=null, pong=null, drv=null, mem=null, bal=null, ice=null, tilt=null, dino=null, total=NaN;
  if(session && typeof session.gatherScores==='function'){
    const gathered=session.gatherScores();
    rxn=gathered.rxn;
    str=gathered.str;
    prs=gathered.prs;
    rfl=gathered.rfl;
    pong=gathered.pong;
    drv=gathered.drv;
    mem=gathered.mem;
    bal=gathered.bal;
    ice=gathered.ice;
    tilt=gathered.tilt;
    dino=gathered.dino;
    total=gathered.total;
  } else {
    rxn=fallbackRead('jsd:rxn');
    str=fallbackRead('jsd:str');
    prs=fallbackRead('jsd:prs');
    rfl=fallbackRead('jsd:rfl');
    pong=fallbackRead('jsd:pong');
    drv=fallbackRead('jsd:drv');
    mem=fallbackRead('jsd:mem');
    bal=fallbackRead('jsd:bal');
    ice=fallbackRead('jsd:ice');
    total=fallbackCompute({rxn,str,prs,rfl,pong,drv,mem,bal,ice});
    tilt=fallbackRead('jsd:tilt');
    dino=fallbackRead('jsd:dino');
    total=fallbackCompute({rxn,str,prs,rfl,pong,drv,mem,bal,ice,tilt,dino});
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
  if(bal){
    if(bal.mode==="sensors"){ details.append(el("div","",t("results.balance_sensors_detail",{std:(bal.std_g?.toFixed(3)??"0"), score:formatScore(bal.score)}))); }
    else if(bal.mode==="touch"){ details.append(el("div","",t("results.balance_touch_detail",{std:(bal.std_px?.toFixed(1)??"0"), score:formatScore(bal.score)}))); }
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
  if(rfl){
    const hits = Number(rfl.hits);
    const attempts = Number(rfl.attempts);
    const best = Number(rfl.best_error_px);
    const avg = Number(rfl.avg_error_px);
    const hitsLabel = Number.isFinite(hits) ? Math.max(0, Math.trunc(hits)) : 0;
    const attemptsLabel = Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) : 0;
    const bestLabel = Number.isFinite(best) ? `${best.toFixed(best >= 100 ? 0 : 1)} px` : '—';
    const avgLabel = Number.isFinite(avg) ? `${avg.toFixed(avg >= 100 ? 0 : 1)} px` : '—';
    details.append(el("div","",t("results.shell_detail",{
      score: formatScore(rfl.score),
      hits: hitsLabel,
      attempts: attemptsLabel,
      best: bestLabel,
      avg: avgLabel
    })));
  }
  if(pong){
    const hits = Number(pong.hits);
    const attempts = Number(pong.attempts);
    const best = Number(pong.best_error_px);
    const avg = Number(pong.avg_error_px);
    details.append(el("div","",t("results.pong_detail",{
      score: formatScore(pong.score),
      hits: Number.isFinite(hits) ? Math.max(0, Math.trunc(hits)) : 0,
      attempts: Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) : 0,
      best: Number.isFinite(best) ? `${best.toFixed(best >= 100 ? 0 : 1)} px` : '—',
      avg: Number.isFinite(avg) ? `${avg.toFixed(avg >= 100 ? 0 : 1)} px` : '—'
    })));
  }
  if(drv){
    const collisions = Number(drv.collisions);
    const avoided = Number(drv.avoided);
    const obstacles = Number(drv.obstacles);
    const distance = Number(drv.distance_m);
    const elapsed = Number(drv.elapsed_ms);
    const collisionsLabel = Number.isFinite(collisions) ? Math.max(0, Math.trunc(collisions)) : 0;
    const avoidedLabel = Number.isFinite(avoided) ? Math.max(0, Math.trunc(avoided)) : null;
    const obstaclesLabel = Number.isFinite(obstacles) ? Math.max(0, Math.trunc(obstacles)) : null;
    const distanceLabel = Number.isFinite(distance) ? `${distance.toFixed(distance >= 100 ? 0 : 1)} m` : '—';
    const timeLabel = Number.isFinite(elapsed) ? `${Math.round(elapsed / 1000)}s` : '—';
    details.append(el("div","",t("results.driving_detail",{
      score: formatScore(drv.score),
      collisions: collisionsLabel,
      avoided: avoidedLabel == null ? '—' : avoidedLabel,
      obstacles: obstaclesLabel == null ? '—' : obstaclesLabel,
      distance: distanceLabel,
      time: timeLabel
    })));
  }
  if(ice){
    const hits = Number(ice.hits);
    const mistakes = Number(ice.mistakes);
    const combo = Number(ice.best_combo);
    details.append(el("div","",t("results.ice_detail",{
      score: formatScore(ice.score),
      hits: Number.isFinite(hits) ? Math.max(0, Math.trunc(hits)) : 0,
      mistakes: Number.isFinite(mistakes) ? Math.max(0, Math.trunc(mistakes)) : 0,
      combo: Number.isFinite(combo) ? Math.max(0, Math.trunc(combo)) : 0
    })));
  }
  if(tilt){
    details.append(el("div","",t("results.tilt_detail",{
      score: formatScore(tilt.score),
      catches: Number.isFinite(Number(tilt.catches)) ? Math.max(0, Math.trunc(Number(tilt.catches))) : 0,
      collisions: Number.isFinite(Number(tilt.collisions)) ? Math.max(0, Math.trunc(Number(tilt.collisions))) : 0,
      control: Number.isFinite(Number(tilt.control)) ? Math.round(Number(tilt.control)*100) : 0
    })));
  }
  if(dino){
    details.append(el("div","",t("results.dino_detail",{
      score: formatScore(dino.score),
      jumps: Number.isFinite(Number(dino.jumps)) ? Math.max(0, Math.trunc(Number(dino.jumps))) : 0,
      obstacles: Number.isFinite(Number(dino.obstacles)) ? Math.max(0, Math.trunc(Number(dino.obstacles))) : 0,
      misses: Number.isFinite(Number(dino.misses)) ? Math.max(0, Math.trunc(Number(dino.misses))) : 0,
      distance: Number.isFinite(Number(dino.distance_m)) ? Number(dino.distance_m).toFixed(1) : '—',
      sensor: Number(dino.sensor_used) === 1 ? t('results.dino_sensor') : t('results.dino_touch')
    })));
  }
  if(!bal && localStorage.getItem("jsd:skip:t4")==="1") details.append(el("div","text-amber-700",t("results.balance_skipped")));
  box.append(details);

  const feedbackCatalog = [
    {id:'t1', section:'rxn', title:'selection.game.t1.title', caption:'selection.game.t1.caption'},
    {id:'t2', section:'str', title:'selection.game.t2.title', caption:'selection.game.t2.caption'},
    {id:'t3', section:'prs', title:'selection.game.t3.title', caption:'selection.game.t3.caption'},
    {id:'t4', section:'bal', title:'selection.game.t4.title', caption:'selection.game.t4.caption'},
    {id:'t5', section:'mem', title:'selection.game.t5.title', caption:'selection.game.t5.caption'},
    {id:'t6', section:'rfl', title:'selection.game.t6.title', caption:'selection.game.t6.caption'},
    {id:'t7', section:'drv', title:'selection.game.t7.title', caption:'selection.game.t7.caption'},
    {id:'t8', section:'pong', title:'selection.game.t8.title', caption:'selection.game.t8.caption'},
    {id:'t9', section:'ice', title:'selection.game.t9.title', caption:'selection.game.t9.caption'},
    {id:'t10', section:'tilt', title:'selection.game.t10.title', caption:'selection.game.t10.caption'},
    {id:'t11', section:'dino', title:'selection.game.t11.title', caption:'selection.game.t11.caption'}
  ];
  const scoreBySection = {rxn, str, prs, bal, mem, rfl, pong, drv, ice, tilt, dino};
  let playedIds = [];
  try {
    const sequence = window.jsdFlow && typeof window.jsdFlow.getSequence === 'function' ? window.jsdFlow.getSequence() : [];
    playedIds = Array.isArray(sequence) ? sequence.filter(id => feedbackCatalog.some(game => game.id === id)) : [];
  } catch (err) {}
  if (!playedIds.length){
    playedIds = feedbackCatalog.filter(game => scoreBySection[game.section]).map(game => game.id);
  }

  const feedbackEnabled = !(window.jsdConfig && window.jsdConfig.settings && window.jsdConfig.settings.session_feedback_enabled === false);
  let feedbackPanel = null;
  if (feedbackEnabled && playedIds.length){
    feedbackPanel = el('section','mt-6 overflow-hidden rounded-[1.75rem] border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-rose-50 p-4 shadow-lg shadow-violet-900/5 dark:border-violet-900/60 dark:from-violet-950/30 dark:via-slate-900/70 dark:to-rose-950/20 sm:p-6');
    feedbackPanel.classList.add('hidden');
    const feedbackHeader = el('div','flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between');
    const feedbackCopy = el('div','space-y-1');
    const feedbackKicker = el('p','text-xs font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300',t('results.feedback.kicker'));
    const feedbackTitle = el('h3','text-xl font-black tracking-tight text-slate-900 dark:text-white',t('results.feedback.title'));
    const feedbackSubtitle = el('p','max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300',t('results.feedback.subtitle'));
    feedbackCopy.append(feedbackKicker, feedbackTitle, feedbackSubtitle);
    const feedbackProgress = el('div','shrink-0 rounded-2xl border border-violet-200 bg-white/80 px-3 py-2 text-sm font-black text-violet-700 shadow-sm dark:border-violet-900/70 dark:bg-slate-900/70 dark:text-violet-200');
    feedbackHeader.append(feedbackCopy, feedbackProgress);
    feedbackPanel.append(feedbackHeader);

    const feedbackGrid = el('div','mt-5 grid gap-3 lg:grid-cols-2');
    const feedbackState = {};
    const feedbackRows = [];
    const scoreForGame = (game) => {
      const section = scoreBySection[game.section];
      const value = section && Number(section.score);
      return Number.isFinite(value) ? value : null;
    };
    const updateFeedbackUi = () => {
      const completed = feedbackRows.filter(row => feedbackState[row.game.id].stars && feedbackState[row.game.id].difficulty).length;
      feedbackProgress.textContent = t('results.feedback.progress',{done:completed,total:feedbackRows.length});
      feedbackRows.forEach(row => {
        const state = feedbackState[row.game.id];
        row.stars.forEach(button => {
          const active = Number(button.dataset.stars) <= Number(state.stars || 0);
          button.textContent = active ? '★' : '☆';
          button.className = active
            ? 'h-9 w-9 rounded-xl text-2xl leading-none text-amber-400 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60'
            : 'h-9 w-9 rounded-xl text-2xl leading-none text-slate-300 transition hover:scale-110 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 dark:text-slate-600';
        });
        row.difficulties.forEach(button => {
          const active = button.dataset.difficulty === state.difficulty;
          button.className = active
            ? 'rounded-xl border border-violet-500 bg-violet-600 px-3 py-2 text-xs font-black text-white shadow-sm transition dark:bg-violet-500'
            : 'rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-violet-700';
        });
      });
      if (feedbackSubmit){
        feedbackSubmit.disabled = submitted || completed !== feedbackRows.length;
      }
    };

    feedbackCatalog.filter(game => playedIds.includes(game.id)).forEach((game, index) => {
      feedbackState[game.id] = {stars:null, difficulty:null};
      const card = el('article','rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/35');
      const cardHead = el('div','flex items-center justify-between gap-3');
      const titleWrap = el('div','min-w-0');
      const gameNumber = el('span','mr-2 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400',String(index + 1).padStart(2,'0'));
      const title = el('span','font-black text-slate-900 dark:text-slate-100',t(game.title));
      const caption = el('span','mt-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400',t(game.caption));
      titleWrap.append(el('div','',`${gameNumber.outerHTML}${title.outerHTML}`),caption);
      const scoreValue = scoreForGame(game);
      const scoreChip = el('span','shrink-0 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',scoreValue == null ? t('results.feedback.not_measured') : `${formatScore(scoreValue)}/100`);
      cardHead.append(titleWrap,scoreChip);
      const starsLabel = el('p','mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400',t('results.feedback.stars_label'));
      const stars = [];
      const starsWrap = el('div','mt-1 flex items-center gap-0.5');
      for(let value=1; value<=5; value += 1){
        const button = el('button','h-9 w-9 rounded-xl text-2xl leading-none text-slate-300 transition hover:scale-110 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60','☆');
        button.type = 'button';
        button.dataset.stars = String(value);
        button.setAttribute('aria-label',t('results.feedback.star_aria',{value}));
        button.addEventListener('click',()=>{ feedbackState[game.id].stars = value; updateFeedbackUi(); });
        stars.push(button); starsWrap.append(button);
      }
      const difficultyLabel = el('p','mt-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400',t('results.feedback.difficulty_label'));
      const difficulties = [];
      const difficultyWrap = el('div','mt-1 flex flex-wrap gap-2');
      [['too_easy','results.feedback.difficulty_easy'],['perfect','results.feedback.difficulty_perfect'],['too_hard','results.feedback.difficulty_hard']].forEach(([value,key])=>{
        const button = el('button','rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-violet-700',t(key));
        button.type = 'button'; button.dataset.difficulty = value;
        button.addEventListener('click',()=>{ feedbackState[game.id].difficulty = value; updateFeedbackUi(); });
        difficulties.push(button); difficultyWrap.append(button);
      });
      card.append(cardHead,starsLabel,starsWrap,difficultyLabel,difficultyWrap);
      feedbackGrid.append(card);
      feedbackRows.push({game,stars,difficulties});
    });
    feedbackPanel.append(feedbackGrid);
    const feedbackActions = el('div','mt-5 flex flex-col gap-3 border-t border-violet-200/70 pt-4 dark:border-violet-900/60 sm:flex-row sm:items-center sm:justify-between');
    const feedbackMessage = el('p','text-sm font-semibold text-slate-500 dark:text-slate-400','');
    const feedbackSubmit = el('button','inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40',t('results.feedback.submit'));
    feedbackSubmit.type = 'button';
    const submitted = localStorage.getItem('jsd:feedback_submitted') === '1';
    let runId = localStorage.getItem('jsd:feedback_run_id');
    if (!runId){
      runId = (window.crypto && typeof window.crypto.randomUUID === 'function') ? window.crypto.randomUUID() : `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('jsd:feedback_run_id',runId);
    }
    const setFeedbackMessage = (key) => { feedbackMessage.textContent = t(key); };
    if (submitted){
      setFeedbackMessage('results.feedback.already_sent');
    }
    feedbackSubmit.addEventListener('click',async()=>{
      const entries = feedbackRows.map(row=>({game_id:row.game.id,score:scoreForGame(row.game),stars:feedbackState[row.game.id].stars,difficulty:feedbackState[row.game.id].difficulty}));
      feedbackSubmit.disabled = true;
      feedbackSubmit.setAttribute('aria-busy','true');
      setFeedbackMessage('results.feedback.sending');
      try {
        const response = await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run_id:runId,entries})});
        const payload = await response.json().catch(()=>({}));
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'feedback_failed');
        localStorage.setItem('jsd:feedback_submitted','1');
        setFeedbackMessage('results.feedback.success');
        feedbackSubmit.textContent = t('results.feedback.sent');
      } catch (err){
        console.error(err);
        setFeedbackMessage('results.feedback.error');
      } finally {
        feedbackSubmit.removeAttribute('aria-busy');
        updateFeedbackUi();
      }
    });
    feedbackActions.append(feedbackMessage,feedbackSubmit);
    feedbackPanel.append(feedbackActions);
    box.append(feedbackPanel);
    updateFeedbackUi();
  }

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
  const deleteScore=el('button','px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/60',t('results.delete_last_score'));
  deleteScore.type='button';
  deleteScore.hidden=true;
  const deleteScoreHint=el('span','w-full text-xs text-slate-500 dark:text-slate-400',t('results.delete_last_score_hint',{remaining:3}));
  deleteScoreHint.hidden=true;
  const currentUser=window.jsdCurrentUser || null;
  const deletionLimit=Number(window.jsdConfig && window.jsdConfig.settings && window.jsdConfig.settings.player_score_deletions_per_day);
  const canDeleteScores=!!(currentUser && Number.isFinite(deletionLimit) && deletionLimit > 0);
  const showDeleteScore=info=>{
    if(!canDeleteScores || !info || !info.id) return;
    deleteScore.hidden=false;
    deleteScoreHint.hidden=false;
    deleteScoreHint.textContent=t('results.delete_last_score_hint',{remaining:deletionLimit});
  };
  if(initialState==='1' && session && typeof session.getLastSubmissionInfo==='function'){
    const cachedInfo=session.getLastSubmissionInfo();
    if(matchesCurrentTotal(cachedInfo)) showDeleteScore(cachedInfo);
  }
  if (feedbackPanel){
    const feedbackLauncher = el('button','px-4 py-2 rounded-xl border border-violet-400 bg-violet-50 text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-100 dark:border-violet-500/70 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20',t('results.feedback.open'));
    feedbackLauncher.type = 'button';
    feedbackLauncher.addEventListener('click',()=>{
      feedbackPanel.classList.toggle('hidden');
      if (!feedbackPanel.classList.contains('hidden')){
        feedbackPanel.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
    actions.append(feedbackLauncher);
  }
  actions.append(stateBadge, deleteScore, share, restart, leaderboard, deleteScoreHint); box.append(actions);

  if(session && typeof session.submitScore==='function'){
    session.submitScore().then((result)=>{
      let customErrorMessage=null;
      if(result){
        if(result.status==='ok' && matchesCurrentTotal(result.saved)){
          showPlacement(result.saved);
          showDeleteScore(result.saved);
        } else if(result.status==='already' && matchesCurrentTotal(result.cached)){
          showPlacement(result.cached);
          showDeleteScore(result.cached);
        } else if(result.status==='ok' && result.response){
          const fallbackInfo={
            id:result.response.id,
            rank:result.response.rank,
            total_entries:result.response.total_entries,
            total_score:normalizedTotal
          };
          if(matchesCurrentTotal(fallbackInfo)){
            showPlacement(fallbackInfo);
            showDeleteScore(fallbackInfo);
          }
        } else if(result.status==='error' && result.response){
          if(result.response.error==='nickname_reserved'){
            customErrorMessage="Ton surnom est vérifié par un autre joueur. Connecte-toi pour enregistrer le score.";
          } else if(result.response.error==='missing_nickname'){
            customErrorMessage="Choisis un surnom pour sauvegarder ton score.";
          } else if(result.response.error==='rate_limited'){
            customErrorMessage=t('results.rate_limited');
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

  deleteScore.addEventListener('click',async()=>{
    if(!canDeleteScores || !window.confirm(t('results.delete_last_score_confirm'))) return;
    deleteScore.disabled=true;
    deleteScore.textContent=t('results.delete_last_score_progress');
    try{
      const response=await fetch('/api/scores/last/delete',{method:'POST',headers:{'Content-Type':'application/json'}});
      const payload=await response.json().catch(()=>null);
      if(response.ok && payload && payload.ok){
        if(session && typeof session.resetProgress==='function') session.resetProgress({keepNickname:true});
        deleteScore.hidden=true;
        deleteScoreHint.hidden=true;
        placementBox.style.display='none';
        stateBadge.className=`${baseBadgeClasses} bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200`;
        stateBadge.textContent=t('results.delete_last_score_success');
        return;
      }
      if(payload && payload.error==='daily_limit'){
        deleteScoreHint.hidden=false;
        deleteScoreHint.textContent=t('results.delete_last_score_limit',{limit:payload.limit || deletionLimit});
        stateBadge.className=`${baseBadgeClasses} bg-amber-100/80 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200`;
        stateBadge.textContent=t('results.delete_last_score_limit',{limit:payload.limit || deletionLimit});
      } else {
        stateBadge.className=`${baseBadgeClasses} bg-rose-100/80 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200`;
        stateBadge.textContent=t('results.delete_last_score_error');
      }
    }catch(err){
      console.error('delete_last_score',err);
      stateBadge.className=`${baseBadgeClasses} bg-rose-100/80 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200`;
      stateBadge.textContent=t('results.delete_last_score_error');
    }finally{
      if(!deleteScore.hidden){
        deleteScore.disabled=false;
        deleteScore.textContent=t('results.delete_last_score');
      }
    }
  });

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
    ['jsd:done:t1','jsd:done:t2','jsd:done:t3','jsd:done:t4','jsd:done:t5','jsd:done:t6','jsd:done:t7','jsd:done:t8','jsd:done:t9','jsd:done:t10','jsd:done:t11','jsd:skip:t4','jsd:rxn','jsd:str','jsd:prs','jsd:rfl','jsd:pong','jsd:drv','jsd:mem','jsd:bal','jsd:ice','jsd:tilt','jsd:dino','jsd:score_submitted','jsd:last_submission','jsd:feedback_run_id','jsd:feedback_submitted']
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
