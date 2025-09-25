(function(){
  const flow = window.jsdFlow || null;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t4')){
    return;
  }
  const G = 9.80665; // m/s^2 per g
  const t=(window.i18n)||((key,vars)=>key);
  const el=(t,c,h)=>{const e=document.createElement(t); if(c) e.className=c; if(h) e.innerHTML=h; return e;};
  const box=document.getElementById("t4");
  const info=el("div","text-sm text-gray-500",t("t4.sensor_instruction",{seconds:8}));
  const btn=el("button","px-4 py-2 rounded-xl bg-black text-white",t("t4.button_label",{seconds:8}));
  const levelWrap=el("div","mt-4 w-full max-w-xs flex flex-col gap-2 items-stretch");
  const motionWrap=el("div","w-full flex flex-col gap-1 items-stretch text-left");
  const motionLabel=el("p","text-xs font-medium text-slate-500 dark:text-slate-400",t("t4.motion_indicator_label"));
  const motionBar=el("div","h-2 rounded-full bg-emerald-100/80 dark:bg-emerald-500/10 overflow-hidden");
  const motionFill=el("div","h-full w-0 bg-rose-400/80 dark:bg-rose-400/90 transition-all duration-150 ease-out","");
  const motionValue=el("p","text-xs font-mono text-slate-500 dark:text-slate-400 text-right",t("t4.motion_indicator_value",{value:"0.000"}));
  motionBar.append(motionFill);
  motionWrap.append(motionLabel,motionBar,motionValue);
  levelWrap.append(motionWrap);
  const fallbackWrap=el("div","hidden mt-3");
  const status=el("div","sr-only","");
  box.append(info,btn,levelWrap,fallbackWrap,status);

  async function fetchSettings(){try{const r=await fetch('/api/settings',{cache:'no-store'});return await r.json();}catch(e){return {};}}
  function norm(v,d){if(v==null)return d;const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?d:n;}
  function defs(s){
    const duration=Math.max(1000,norm(s.bal_duration_ms,8000));
    const low=norm(s.bal_low_good,0.02);
    let high=norm(s.bal_high_bad,0.10);
    const linTolRaw=norm(s.bal_lin_rel_tol,0.15);
    const linTol=(Number.isFinite(linTolRaw) && linTolRaw>=0)?linTolRaw:0.15;
    const cheatEnabledRaw=s.bal_cheat_detection_enabled;
    const cheatEnabled=cheatEnabledRaw===undefined?true:!!cheatEnabledRaw;
    const cheatThresholdRaw=norm(s.bal_cheat_std_threshold,0.006);
    const cheatThreshold=Number.isFinite(cheatThresholdRaw)?cheatThresholdRaw:null;
    const cheatMinEventsRaw=norm(s.bal_cheat_min_events,25);
    const cheatMinEvents=Number.isFinite(cheatMinEventsRaw)?Math.max(0,Math.round(cheatMinEventsRaw)):0;
    const cheatAvatarPath=typeof s.bal_cheat_avatar_path==='string'?s.bal_cheat_avatar_path:null;
    if(!isFinite(high) || high<=low){
      high=low+0.02;
    }
    return{
      mode:s.bal_mode||'lin',
      duration,
      low_good:Math.max(0,low),
      high_bad:Math.max(0,high),
      lin_rel_tol:linTol,
      cheat_enabled:cheatEnabled,
      cheat_std_threshold:cheatThreshold,
      cheat_min_events:cheatMinEvents,
      cheat_avatar_path:cheatAvatarPath
    };
  }

  let started=false, finished=false, events=0, lastTs=0, note="", src={dm:false};
  let cheatState={detected:false};
  let stats={count:0, mean:0, m2:0};
  let watchdog=null, endTimer=null, fallbackMode=false, measureStart=0;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);

  // Gravity estimate for devices without e.acceleration (we only get includingGravity)
  let gEst = {x:0,y:0,z:0}, gInit=false;
  const alpha = 0.98; // low-pass factor for gravity

  let ST=defs({});
  const settingsPromise=(async()=>{const raw=await fetchSettings();return defs(raw);})().catch(()=>defs({}));
  settingsPromise.then(s=>{
    ST=s;
    const seconds=Math.max(1,Math.round(ST.duration/1000));
    info.textContent=t("t4.sensor_instruction",{seconds});
    btn.textContent=t("t4.button_label",{seconds});
    updateMotionIndicator();
    updateStatus();
  });

  function resetStats(){
    stats={count:0, mean:0, m2:0};
  }

  function currentStd(){
    if (stats.count < 2) return 0;
    return Math.sqrt(stats.m2 / stats.count);
  }

  function updateMotionIndicator(){
    if(!motionFill || !motionValue) return;
    const std=currentStd();
    const low=Number.isFinite(ST.low_good)?Math.max(0,ST.low_good):0;
    const high=Number.isFinite(ST.high_bad)?Math.max(low+1e-3,ST.high_bad):low+0.05;
    let score;
    if (std <= low) score = 1;
    else if (std >= high) score = 0;
    else score = (high - std) / Math.max(1e-6, high - low);
    score = Math.max(0, Math.min(1, score));
    const hue = 120 * score;
    motionFill.style.width=`${Math.round(score*100)}%`;
    motionFill.style.backgroundColor=`hsl(${Math.round(hue)}, 85%, 50%)`;
    motionValue.textContent=t('t4.motion_indicator_value',{value:std.toFixed(3)});
  }

  function detectCheat(stdValue, eventCount){
    const result={detected:false};
    if(Number.isFinite(stdValue)){
      result.std_g=stdValue;
    }
    const threshold=Number(ST.cheat_std_threshold);
    if(Number.isFinite(threshold)){
      result.threshold=threshold;
    }
    const minEventsRaw=Number(ST.cheat_min_events);
    const minEvents=Number.isFinite(minEventsRaw)?Math.max(0,Math.round(minEventsRaw)):0;
    result.min_events=minEvents;
    if(Number.isFinite(eventCount)){
      result.events=eventCount;
    }
    if(!ST.cheat_enabled || !Number.isFinite(threshold) || typeof result.std_g!=='number'){
      return result;
    }
    const meetsEvents=(!('events' in result)) || result.events>=minEvents;
    if(meetsEvents && result.std_g<=threshold){
      result.detected=true;
      result.reason='std_threshold';
    }
    return result;
  }

  function updateStatus(extra=""){
    const lines=[
      `HTTPS: ${location.protocol==='https:'}`,
      `SecureContext: ${!!window.isSecureContext}`,
      `UA: ${navigator.userAgent}`,
      `Events: ${events}`,
      `LastEvent(ms): ${Math.round(lastTs)}`,
      `Src: dm=${src.dm}`,
      `Std: ${currentStd().toFixed(4)}`,
      `Mode: ${ST.mode} dur=${ST.duration}ms low=${ST.low_good} high=${ST.high_bad}`,
      ST.cheat_enabled
        ? `Cheat: thr=${ST.cheat_std_threshold ?? '—'} minE=${ST.cheat_min_events} flagged=${cheatState && cheatState.detected}`
        : 'Cheat: disabled',
      note?`Note: ${note}`:""
    ]; if(extra) lines.push(extra);
    status.textContent=lines.filter(Boolean).join("\n");
  }
  function pushVal(v){
    if(finished) return;
    const prevMean=stats.mean;
    stats.count+=1;
    const delta=v-prevMean;
    stats.mean+=delta/stats.count;
    const delta2=v-stats.mean;
    stats.m2+=delta*delta2;
    events++;
    lastTs=performance.now();
  }

  function onDev(e){
    src.dm=true;
    const acc = e.acceleration; // already gravity removed on many devices (Android Chrome)
    const accIG = e.accelerationIncludingGravity;
    let magG = null;

    if (ST.mode === 'lin'){
      const hasAcc = acc && acc.x!=null && acc.y!=null && acc.z!=null;
      const hasAccIG = accIG && accIG.x!=null && accIG.y!=null && accIG.z!=null;
      let magAcc = null;
      let magHP = null;
      let magTotal = null;

      if (hasAccIG){
        // Estimate gravity and subtract (linear = includingGravity - gravity_estimate)
        if (!gInit){
          gEst = {x: accIG.x, y: accIG.y, z: accIG.z};
          gInit = true;
        } else {
          gEst = {
            x: alpha*gEst.x + (1-alpha)*accIG.x,
            y: alpha*gEst.y + (1-alpha)*accIG.y,
            z: alpha*gEst.z + (1-alpha)*accIG.z
          };
        }
        const lin = { x: accIG.x - gEst.x, y: accIG.y - gEst.y, z: accIG.z - gEst.z };
        magHP = Math.hypot(lin.x, lin.y, lin.z) / G;
        magTotal = Math.hypot(accIG.x||0, accIG.y||0, accIG.z||0) / G;
      }

      if (hasAcc){
        magAcc = Math.hypot(acc.x||0, acc.y||0, acc.z||0) / G;
      }

      if (hasAcc && hasAccIG){
        const diff = Math.abs((magAcc||0) - (magTotal||0));
        const denom = Math.max(magAcc||0, magTotal||0, 1e-6);
        const rel = Math.max(0, Math.min(1, diff / denom));
        const tolRaw = ST.lin_rel_tol ?? 0.15;
        const tol = (Number.isFinite(tolRaw) && tolRaw>=0) ? tolRaw : 0.15;
        if (rel <= tol && magHP!=null){
          magG = magHP;
          note = "mode:accIG-HPF";
        } else {
          magG = magAcc;
          note = "mode:acc";
        }
      } else if (hasAcc){
        magG = magAcc;
        note = "mode:acc";
      } else if (hasAccIG && magHP!=null){
        magG = magHP;
        note = "mode:accIG-HPF";
      }
    } else {
      const srcAcc = accIG || acc;
      if (srcAcc && srcAcc.x!=null && srcAcc.y!=null && srcAcc.z!=null){
        magG = Math.hypot(srcAcc.x||0, srcAcc.y||0, srcAcc.z||0) / G;
        note = accIG ? "mode:accIG-total" : "mode:acc-total";
      }
    }
    if (magG!=null){
      pushVal(magG);
      updateMotionIndicator();
    }
  }

  function attachBasic(){
    window.addEventListener('devicemotion', onDev, {passive:true});
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') stopAll('hidden'); });
  }
  function detachAll(){
    window.removeEventListener('devicemotion', onDev);
  }
  function stopAll(reason){
    if (watchdog){ clearInterval(watchdog); watchdog=null; }
    if (endTimer){ clearTimeout(endTimer); endTimer=null; }
    detachAll(); updateStatus('stop:'+reason);
  }

  function sensorsSuccess(){
    if (finished) return;
    finished=true;
    stopAll('finish');
    const std=currentStd();

    const low=ST.low_good, high=ST.high_bad;
    let s;
    if (std <= low) { s = 100; }
    else if (std >= high) { s = 0; }
    else { s = (high - std) / Math.max(1e-6, (high - low)) * 100; }

    s = Math.max(0, Math.min(100, Math.round(s)));
    const durationMs=Math.round(Math.max(0, performance.now()-measureStart));
    const stdStored = Number.isFinite(std) ? Number(std.toFixed(4)) : null;
    const cheatRecord = detectCheat(std, stats.count);
    cheatState = cheatRecord;
    if(window.jsdSession && typeof window.jsdSession.invalidateSubmission==='function'){
      window.jsdSession.invalidateSubmission();
    }else{
      try{localStorage.removeItem('jsd:score_submitted');localStorage.removeItem('jsd:last_submission');}catch(err){}
    }
    const payload={ mode:'sensors', duration_ms:durationMs, std_g:stdStored, score:s, events:stats.count };
    if(cheatRecord && typeof cheatRecord==='object'){
      const cloned={...cheatRecord};
      if(cloned.std_g==null && stdStored!=null){ cloned.std_g=stdStored; }
      payload.cheat=cloned;
    }
    localStorage.setItem('jsd:bal', JSON.stringify(payload));
    localStorage.setItem('jsd:done:t4','1');
    if (window.jsdSession && typeof window.jsdSession.submitScore === 'function'){
      window.jsdSession.submitScore().catch(console.error);
    }
    btn.textContent=t('t4.fallback_status_done');
    document.getElementById('next').classList.remove('opacity-50','pointer-events-none');
    const nextRoute = flow && typeof flow.nextRoute === 'function' ? flow.nextRoute('t4') : '/t5';
    setTimeout(()=>{ location.href = nextRoute; }, 600);
  }

  function startFallback(){
    if (finished) return;
    fallbackMode=true;
    cheatState={detected:false};
    levelWrap.classList.add('hidden');
    const seconds=Math.max(1,Math.round(ST.duration/1000));
    info.textContent=t('t4.fallback_instruction',{seconds});
    btn.classList.add('hidden');
    const area=el('div','relative w-full max-w-xs h-72 mx-auto mt-2 rounded-2xl border bg-white dark:bg-slate-800 overflow-hidden select-none');
    Object.assign(area.style, {
      touchAction:'none',
      userSelect:'none',
      WebkitUserSelect:'none',
      WebkitTouchCallout:'none',
      msUserSelect:'none'
    });
    const circle=el('div','absolute rounded-full border-2'); circle.style.width='140px'; circle.style.height='140px'; circle.style.left='50%'; circle.style.top='50%'; circle.style.transform='translate(-50%,-50%)'; circle.style.borderColor='#0ea5e9'; circle.style.background='rgba(14,165,233,0.06)';
    const fbStatus=el('div','mt-2 text-center text-sm',t('t4.fallback_status_ready'));
    area.append(circle); fallbackWrap.append(area, fbStatus); fallbackWrap.classList.remove('hidden');

    let running=false, points=[]; let center=null; let timer=null; let fallbackStart=0;
    const dist=(a,b)=>Math.hypot(a.x-b.x, a.y-b.y);
    function finishTouch(){
      if (finished) return;
      running=false; clearTimeout(timer);
      if (points.length<32){ fbStatus.textContent=t('t4.fallback_status_short'); return; }
      const dists=points.map(p=>dist(p, center));
      const mean=dists.reduce((a,b)=>a+b,0)/dists.length;
      const variance=dists.reduce((a,b)=>a+Math.pow(b-mean,2),0)/dists.length;
      const stdPx=Math.sqrt(variance);
      const score=Math.max(0, Math.min(100, Math.round(100*(1-(stdPx-4)/(20-4)))));
      finished=true;
      cheatState={detected:false};
      const durationMs=Math.round(Math.max(0, performance.now()-fallbackStart));
      if(window.jsdSession && typeof window.jsdSession.invalidateSubmission==='function'){
        window.jsdSession.invalidateSubmission();
      }else{
        try{localStorage.removeItem('jsd:score_submitted');localStorage.removeItem('jsd:last_submission');}catch(err){}
      }
      localStorage.setItem('jsd:bal', JSON.stringify({ mode:'touch', duration_ms:durationMs, std_px:stdPx, score, events:points.length }));
      localStorage.setItem('jsd:done:t4','1');
      if (window.jsdSession && typeof window.jsdSession.submitScore === 'function'){
        window.jsdSession.submitScore().catch(console.error);
      }
      fbStatus.textContent=t('t4.fallback_status_done');
      document.getElementById('next').classList.remove('opacity-50','pointer-events-none');
      const nextRoute = flow && typeof flow.nextRoute === 'function' ? flow.nextRoute('t4') : '/t5';
      setTimeout(()=>{ location.href = nextRoute; }, 600);
    }
    area.addEventListener('contextmenu', e=>e.preventDefault());
    area.addEventListener('selectstart', e=>e.preventDefault());
    area.addEventListener('gesturestart', e=>e.preventDefault());

    area.addEventListener('pointerdown',(e)=>{
      e.preventDefault();
      area.setPointerCapture(e.pointerId);
      const r=area.getBoundingClientRect();
      center={x:r.width/2, y:r.height/2};
      points=[{x:e.clientX-r.left, y:e.clientY-r.top, ts:performance.now()}];
      fallbackStart=performance.now();
      running=true; fbStatus.textContent=t('t4.fallback_status_running');
      timer=setTimeout(finishTouch, ST.duration);
    }, {passive:false});
    area.addEventListener('pointermove',(e)=>{
      if(!running) return;
      e.preventDefault();
      const r=area.getBoundingClientRect();
      points.push({x:e.clientX-r.left, y:e.clientY-r.top, ts:performance.now()});
    }, {passive:false});
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>area.addEventListener(type,(e)=>{ e.preventDefault(); if(running) finishTouch(); }, {passive:false}));
  }

  async function start(){
    if (started || finished) return;
    started=true; events=0; lastTs=0; note=''; src={dm:false};
    cheatState={detected:false};
    resetStats();
    fallbackMode=false;
    gEst={x:0,y:0,z:0}; gInit=false;
    btn.textContent=t('t4.button_measuring');
    updateMotionIndicator();

    if (location.protocol!=='https:' && !['localhost','127.0.0.1'].includes(location.hostname)){
      started=false; btn.textContent=t('t4.button_blocked_http'); return;
    }

    try {
      ST=await settingsPromise;
    } catch(e){
      ST=defs({});
    }
    updateMotionIndicator();

    if (isIOS){
      try{
        if (typeof DeviceMotionEvent!=='undefined' && typeof DeviceMotionEvent.requestPermission==='function'){
          const pm=await DeviceMotionEvent.requestPermission(); if(pm!=='granted'){ note='iOS motion denied'; updateStatus(); startFallback(); return; }
        }
        if (typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
          const po=await DeviceOrientationEvent.requestPermission(); if(po!=='granted'){ note='iOS orientation denied'; updateStatus(); startFallback(); return; }
        }
      }catch(e){ note='iOS permission error'; updateStatus(); startFallback(); return; }
    }

    attachBasic();
    measureStart=performance.now();

    const t0=performance.now();
    watchdog=setInterval(()=>{
      updateStatus();
      const elapsed=performance.now()-t0;
      if (!fallbackMode && !finished && events===0 && elapsed>1500){
        stopAll('noevents'); startFallback();
      }
    }, 300);

    endTimer=setTimeout(()=>{
      if (finished || fallbackMode) return;
      if (events > 0) sensorsSuccess();
      else { stopAll('timeout-noevents'); startFallback(); }
    }, ST.duration);
  }

  btn.addEventListener('click', start);
  updateMotionIndicator();
  updateStatus();
})();
