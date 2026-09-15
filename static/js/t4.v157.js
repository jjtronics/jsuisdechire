(function(){
  const flow = window.jsdFlow || null;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t4')){
    return;
  }
  const G = 9.80665; // m/s^2 per g
  const t=(window.i18n)||((key,vars)=>key);
  const el=(t,c,h)=>{const e=document.createElement(t); if(c) e.className=c; if(h) e.innerHTML=h; return e;};
  const box=document.getElementById("t4");
  const style=document.createElement("style");
  style.textContent=`
    #t4 .t4-instruction{padding:.8rem 1rem;border:1px solid rgba(14,165,233,.2);border-radius:16px;background:rgba(240,249,255,.78);color:#075985;text-align:center;font-size:.9rem;font-weight:800;}
    #t4 .t4-start{min-height:3.25rem;min-width:13rem;margin-top:1rem;border-radius:16px;background:linear-gradient(135deg,#0ea5e9,#4f46e5);color:#fff;font-size:1rem;font-weight:950;box-shadow:0 16px 28px -18px rgba(37,99,235,.9);}
    #t4 .t4-level{width:100%;max-width:30rem;margin:1rem auto 0;padding:1rem;border:1px solid rgba(14,165,233,.18);border-radius:22px;background:linear-gradient(135deg,rgba(240,249,255,.92),rgba(238,242,255,.82));box-shadow:0 18px 36px -28px rgba(30,64,175,.7);}
    #t4 .t4-motion-wrap{text-align:center;}
    #t4 .t4-beer-scene{--tilt:0deg;--spill:0;--slosh:0;position:relative;height:12rem;overflow:hidden;border-radius:1rem;background:radial-gradient(circle at 50% 18%,rgba(255,255,255,.9),transparent 28%),linear-gradient(180deg,#dff7ff,#bfe8fb 62%,#8bd0ec);box-shadow:inset 0 -1rem rgba(8,145,178,.12),inset 0 1px rgba(255,255,255,.8);}
    #t4 .t4-beer-scene::before{content:'';position:absolute;z-index:0;left:-10%;right:-10%;bottom:1.15rem;height:2.1rem;border-radius:50%;background:linear-gradient(180deg,rgba(14,116,144,.15),rgba(8,145,178,.28));transform:perspective(11rem) rotateX(58deg);}
    #t4 .t4-beer-scene::after{content:'';position:absolute;z-index:0;left:0;right:0;bottom:0;height:1.35rem;background:linear-gradient(#0e7490,#155e75);box-shadow:inset 0 .18rem rgba(255,255,255,.15);}
    #t4 .t4-mug-wrap{position:absolute;z-index:2;left:50%;bottom:1.2rem;width:7.1rem;height:9.1rem;transform:translateX(-50%) rotate(var(--tilt));transform-origin:50% 92%;transition:transform 100ms cubic-bezier(.2,.85,.3,1);filter:drop-shadow(0 .6rem .45rem rgba(8,47,73,.28));}
    #t4 .t4-mug{position:absolute;left:1rem;bottom:0;width:4.8rem;height:7rem;overflow:hidden;border:3px solid #fef3c7;border-radius:.65rem .65rem 1.25rem 1.25rem;background:linear-gradient(100deg,rgba(255,255,255,.65),rgba(255,255,255,.12) 30%,rgba(255,255,255,.32) 72%,rgba(255,255,255,.08));box-shadow:inset .4rem 0 rgba(255,255,255,.28),inset -.35rem 0 rgba(120,53,15,.2),0 .3rem 0 #92400e;}
    #t4 .t4-mug::before{content:'';position:absolute;z-index:3;left:-.18rem;right:-.18rem;top:-.38rem;height:1.05rem;border:3px solid #fff7ed;border-radius:50%;background:#fffdf5;box-shadow:0 .15rem .15rem rgba(120,53,15,.18);}
    #t4 .t4-beer{position:absolute;z-index:1;left:.25rem;right:.25rem;bottom:.2rem;height:5.6rem;border-radius:.3rem .3rem .9rem .9rem;background:linear-gradient(90deg,#fcd34d,#f59e0b 42%,#b45309);box-shadow:inset .35rem 0 rgba(255,255,255,.22),inset -.35rem 0 rgba(120,53,15,.2);transform:translateY(calc(var(--slosh) * -0.12rem));transition:transform 90ms ease;}
    #t4 .t4-beer::before{content:'';position:absolute;left:0;right:0;top:-.16rem;height:.48rem;border-radius:50%;background:#fef3c7;box-shadow:0 .08rem .12rem rgba(120,53,15,.16);}
    #t4 .t4-mug-handle{position:absolute;z-index:0;right:.05rem;top:2.2rem;width:2.15rem;height:3.2rem;border:.65rem solid #fbbf24;border-left:0;border-radius:0 1.5rem 1.5rem 0;box-shadow:inset -.15rem 0 #92400e;}
    #t4 .t4-spill{position:absolute;z-index:1;left:calc(50% + 2.1rem);bottom:5.2rem;width:3.8rem;height:1.1rem;border-radius:65% 35% 60% 40%;background:linear-gradient(90deg,rgba(251,191,36,.9),rgba(217,119,6,.85));opacity:var(--spill);transform:rotate(var(--tilt)) scaleX(var(--spill));transform-origin:left center;transition:opacity 100ms ease,transform 100ms ease;filter:drop-shadow(0 .2rem .1rem rgba(120,53,15,.18));}
    #t4 .t4-drop{position:absolute;z-index:1;width:.62rem;height:.86rem;border-radius:60% 40% 60% 40%;background:#fbbf24;opacity:var(--spill);transition:opacity 100ms ease;}
    #t4 .t4-drop-one{left:calc(50% + 4rem);bottom:3.9rem;transform:translateY(calc(var(--spill) * 1.15rem)) rotate(28deg);}
    #t4 .t4-drop-two{left:calc(50% - 4.5rem);bottom:3.3rem;transform:translateY(calc(var(--spill) * .65rem)) rotate(-24deg);}
    #t4 .t4-motion-value{margin:.65rem 0 0;color:#0c4a6e;font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}
    #t4 .t4-fallback{width:100%;margin-top:1rem;}
    html.dark #t4 .t4-instruction{border-color:rgba(56,189,248,.25);background:rgba(14,116,144,.16);color:#bae6fd;}
    html.dark #t4 .t4-level{border-color:rgba(56,189,248,.22);background:linear-gradient(135deg,rgba(14,116,144,.16),rgba(49,46,129,.2));}
    html.dark #t4 .t4-beer-scene{background:radial-gradient(circle at 50% 18%,rgba(255,255,255,.12),transparent 28%),linear-gradient(180deg,#164e63,#155e75 62%,#0f172a);box-shadow:inset 0 -1rem rgba(2,6,23,.24),inset 0 1px rgba(255,255,255,.12);}
    html.dark #t4 .t4-motion-value{color:#bae6fd;}
  `;
  document.head.appendChild(style);
  const info=el("div","t4-instruction",t("t4.sensor_instruction",{seconds:8}));
  const btn=el("button","t4-start px-4 py-2",t("t4.button_label",{seconds:8}));
  const levelWrap=el("div","t4-level flex flex-col gap-2 items-stretch");
  const motionWrap=el("div","t4-motion-wrap w-full");
  const motionLabel=el("p","text-xs font-black uppercase tracking-[.14em] text-sky-700 dark:text-sky-200",t("t4.motion_indicator_label"));
  const beerScene=el("div","t4-beer-scene mt-2","");
  const spill=el("span","t4-spill");
  const dropOne=el("span","t4-drop t4-drop-one");
  const dropTwo=el("span","t4-drop t4-drop-two");
  const mugWrap=el("span","t4-mug-wrap");
  const handle=el("span","t4-mug-handle");
  const mug=el("span","t4-mug");
  mug.append(el("span","t4-beer")); mugWrap.append(handle,mug);
  const motionValue=el("p","t4-motion-value",t("t4.motion_indicator_value",{value:"0.000"}));
  beerScene.append(spill,dropOne,dropTwo,mugWrap);
  motionWrap.append(motionLabel,beerScene,motionValue);
  levelWrap.append(motionWrap);
  const fallbackWrap=el("div","t4-fallback hidden mt-3");
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
  let visualLean=0;
  let cheatState={detected:false};
  let stats={count:0, mean:0, m2:0};
  let liveValues=[];
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
    liveValues=[];
  }

  function currentStd(){
    if (stats.count < 2) return 0;
    return Math.sqrt(stats.m2 / stats.count);
  }

  function currentLiveStd(){
    if (liveValues.length < 2) return 0;
    const mean=liveValues.reduce((sum,value)=>sum+value,0)/liveValues.length;
    const variance=liveValues.reduce((sum,value)=>sum+Math.pow(value-mean,2),0)/liveValues.length;
    return Math.sqrt(variance);
  }

  function updateMotionIndicator(){
    if(!beerScene || !motionValue) return;
    const std=currentLiveStd();
    const low=Number.isFinite(ST.low_good)?Math.max(0,ST.low_good):0;
    const high=Number.isFinite(ST.high_bad)?Math.max(low+1e-3,ST.high_bad):low+0.05;
    let score;
    // The live bar intentionally uses the short window without the scoring
    // floor, so even a small movement is visible immediately.
    score = 1 - (std / Math.max(1e-6, high));
    score = Math.max(0, Math.min(1, score));
    const spillAmount=clamp((1-score)*1.25,0,1);
    beerScene.style.setProperty('--tilt',`${visualLean.toFixed(1)}deg`);
    beerScene.style.setProperty('--spill',spillAmount.toFixed(2));
    beerScene.style.setProperty('--slosh',Math.min(1,(1-score)*1.8).toFixed(2));
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
    status.textContent = extra || "";
  }
  function pushVal(v){
    if(finished) return;
    const prevMean=stats.mean;
    stats.count+=1;
    const delta=v-prevMean;
    stats.mean+=delta/stats.count;
    const delta2=v-stats.mean;
    stats.m2+=delta*delta2;
    liveValues.push(v);
    if(liveValues.length>6) liveValues.shift();
    events++;
    lastTs=performance.now();
  }

  function onDev(e){
    src.dm=true;
    const acc = e.acceleration; // already gravity removed on many devices (Android Chrome)
    const accIG = e.accelerationIncludingGravity;
    let magG = null;
    let visualAccelerationX = 0;
    let linearAccelerationX = 0;

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
        linearAccelerationX = lin.x / G;
        magHP = Math.hypot(lin.x, lin.y, lin.z) / G;
        magTotal = Math.hypot(accIG.x||0, accIG.y||0, accIG.z||0) / G;
      }

      if (hasAcc){
        magAcc = Math.hypot(acc.x||0, acc.y||0, acc.z||0) / G;
        visualAccelerationX = (acc.x||0) / G;
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
        visualAccelerationX = linearAccelerationX;
      }
    } else {
      const srcAcc = accIG || acc;
      if (srcAcc && srcAcc.x!=null && srcAcc.y!=null && srcAcc.z!=null){
        magG = Math.hypot(srcAcc.x||0, srcAcc.y||0, srcAcc.z||0) / G;
        visualAccelerationX = ((acc && acc.x!=null ? acc.x : srcAcc.x)||0) / G;
        note = accIG ? "mode:accIG-total" : "mode:acc-total";
      }
    }
    if (magG!=null){
      const nextLean=clamp(visualAccelerationX*55,-17,17);
      visualLean += (nextLean-visualLean)*.42;
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
    visualLean=0;
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
