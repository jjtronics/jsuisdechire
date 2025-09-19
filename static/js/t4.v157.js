(function(){
  const G = 9.80665; // m/s^2 per g
  const t=(window.i18n)||((key,vars)=>key);
  const el=(t,c,h)=>{const e=document.createElement(t); if(c) e.className=c; if(h) e.innerHTML=h; return e;};
  const box=document.getElementById("t4");
  const info=el("div","text-sm text-gray-500",t("t4.sensor_instruction",{seconds:8}));
  const btn=el("button","px-4 py-2 rounded-xl bg-black text-white",t("t4.button_label",{seconds:8}));
  const levelWrap=el("div","mt-4 flex flex-col items-center gap-2");
  const level=el("div","relative rounded-full border border-emerald-400/60 bg-gradient-to-br from-white via-sky-50 to-emerald-50 shadow-inner overflow-hidden","");
  level.style.width="160px";
  level.style.height="160px";
  const crossH=el("div","absolute left-0 top-1/2 w-full h-px bg-emerald-200/70 pointer-events-none","");
  const crossV=el("div","absolute left-1/2 top-0 w-px h-full bg-emerald-200/70 pointer-events-none","");
  const bubble=el("div","absolute rounded-full border border-emerald-500/60 bg-emerald-300/70 shadow-lg backdrop-blur-sm transition-transform duration-150 ease-out","");
  bubble.style.width="56px";
  bubble.style.height="56px";
  bubble.style.transform="translate(-50%,-50%)";
  const levelHint=el("p","text-xs text-slate-500 dark:text-slate-400 text-center",t("t4.level_hint"));
  const motionWrap=el("div","w-full max-w-xs flex flex-col gap-1 items-stretch text-left");
  const motionLabel=el("p","text-xs font-medium text-slate-500 dark:text-slate-400",t("t4.motion_indicator_label"));
  const motionBar=el("div","h-2 rounded-full bg-emerald-100/80 dark:bg-emerald-500/10 overflow-hidden");
  const motionFill=el("div","h-full w-0 bg-rose-400/80 dark:bg-rose-400/90 transition-all duration-150 ease-out","");
  const motionValue=el("p","text-xs font-mono text-slate-500 dark:text-slate-400 text-right",t("t4.motion_indicator_value",{value:"0.00"}));
  motionBar.append(motionFill);
  motionWrap.append(motionLabel,motionBar,motionValue);
  level.append(crossH,crossV,bubble);
  levelWrap.append(level,levelHint,motionWrap);
  const fallbackWrap=el("div","hidden mt-3");
  const status=el("div","sr-only","");
  box.append(info,btn,levelWrap,fallbackWrap,status);

  async function fetchSettings(){try{const r=await fetch('/api/settings',{cache:'no-store'});return await r.json();}catch(e){return {};}}
  function norm(v,d){if(v==null)return d;const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?d:n;}
  function defs(s){const duration=Math.max(1000,norm(s.bal_duration_ms,8000));return{mode:s.bal_mode||'lin',duration,low_good:norm(s.bal_low_good,0.30),high_bad:norm(s.bal_high_bad,0.50)};}

  let started=false, finished=false, events=0, lastTs=0, values=[], note="", src={dm:false, do:false};
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
    updateStatus();
  });

  function levelMaxOffset(){
    const maxX=(level.clientWidth-bubble.clientWidth)/2;
    const maxY=(level.clientHeight-bubble.clientHeight)/2;
    return {x:Math.max(0,maxX), y:Math.max(0,maxY)};
  }

  function setBubble(dx,dy){
    const max=levelMaxOffset();
    const clampedX=Math.max(-max.x, Math.min(max.x, dx));
    const clampedY=Math.max(-max.y, Math.min(max.y, dy));
    bubble.style.transform=`translate(-50%,-50%) translate(${clampedX}px, ${clampedY}px)`;
  }

  function updateBubbleFromGravity(gx,gy,gz){
    const norm=Math.hypot(gx,gy,gz) || 1;
    if(!norm) return;
    const scale=levelMaxOffset();
    if(scale.x===0 && scale.y===0) return;
    const nx=gx/norm;
    const ny=gy/norm;
    setBubble(-nx*scale.x, ny*scale.y);
  }

  function updateBubbleFromOrientation(beta,gamma){
    const scale=levelMaxOffset();
    if(scale.x===0 && scale.y===0) return;
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
    const nx=clamp(gamma/45,-1,1);
    const ny=clamp(beta/45,-1,1);
    setBubble(nx*scale.x, -ny*scale.y);
  }

  function updateMotionIndicator(mag){
    if(!motionFill || !motionValue) return;
    const ref=Math.max(0.05, ST.high_bad || 0.5);
    const ratio=Math.max(0, Math.min(1, mag / ref));
    motionFill.style.width=`${Math.round(ratio*100)}%`;
    motionFill.style.opacity=0.2 + 0.6*ratio;
    motionValue.textContent=t('t4.motion_indicator_value',{value:mag.toFixed(2)});
  }

  function updateStatus(extra=""){
    const lines=[
      `HTTPS: ${location.protocol==='https:'}`,
      `SecureContext: ${!!window.isSecureContext}`,
      `UA: ${navigator.userAgent}`,
      `Events: ${events}`,
      `LastEvent(ms): ${Math.round(lastTs)}`,
      `Src: dm=${src.dm} do=${src.do}`,
      `Mode: ${ST.mode} dur=${ST.duration}ms low=${ST.low_good} high=${ST.high_bad}`,
      note?`Note: ${note}`:""
    ]; if(extra) lines.push(extra);
    status.textContent=lines.filter(Boolean).join("\n");
  }
  function pushVal(v){ if(finished) return; values.push(v); events++; lastTs=performance.now(); }

  function onDev(e){
    src.dm=true;
    const acc = e.acceleration; // already gravity removed on many devices (Android Chrome)
    const accIG = e.accelerationIncludingGravity;
    let magG = null;

    if (ST.mode === 'lin'){
      if (acc && acc.x!=null && acc.y!=null && acc.z!=null){
        // Use linear acceleration directly, convert to g
        const m = Math.hypot(acc.x||0, acc.y||0, acc.z||0) / G;
        magG = m;
        note = "mode:acc";
      } else if (accIG && accIG.x!=null && accIG.y!=null && accIG.z!=null){
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
        magG = Math.hypot(lin.x, lin.y, lin.z) / G;
        note = "mode:accIG-HPF";
      }
    } else {
      const srcAcc = accIG || acc;
      if (srcAcc && srcAcc.x!=null && srcAcc.y!=null && srcAcc.z!=null){
        magG = Math.hypot(srcAcc.x||0, srcAcc.y||0, srcAcc.z||0) / G;
        note = accIG ? "mode:accIG-total" : "mode:acc-total";
      }
    }
    if (accIG && accIG.x!=null && accIG.y!=null && accIG.z!=null){
      updateBubbleFromGravity(accIG.x, accIG.y, accIG.z);
    }
    if (magG!=null){
      updateMotionIndicator(magG);
      pushVal(magG);
    }
  }
  function onOri(e){
    src.do=true;
    if (e && typeof e.beta==='number' && typeof e.gamma==='number'){
      updateBubbleFromOrientation(e.beta, e.gamma);
    }
  }

  function attachBasic(){
    window.addEventListener('devicemotion', onDev, {passive:true});
    window.addEventListener('deviceorientation', onOri, {passive:true});
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') stopAll('hidden'); });
  }
  function detachAll(){
    window.removeEventListener('devicemotion', onDev);
    window.removeEventListener('deviceorientation', onOri);
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
    // Std over linear acceleration magnitude in g
    const mean=values.reduce((a,b)=>a+b,0)/Math.max(1,values.length);
    const variance=values.reduce((a,b)=>a+Math.pow(b-mean,2),0)/Math.max(1,values.length);
    const std=Math.sqrt(variance);

    const low=ST.low_good, high=ST.high_bad;
    let s;
    if (std <= low) { s = 100; }
    else if (std >= high) { s = 0; }
    else { s = (high - std) / Math.max(1e-6, (high - low)) * 100; }

    s = Math.max(0, Math.min(100, Math.round(s)));
    const durationMs=Math.round(Math.max(0, performance.now()-measureStart));
    localStorage.setItem('jsd:bal', JSON.stringify({ mode:'sensors', duration_ms:durationMs, std_g:std, score:s }));
    localStorage.setItem('jsd:done:t4','1');
    btn.textContent=t('t4.fallback_status_done');
    document.getElementById('next').classList.remove('opacity-50','pointer-events-none');
    setTimeout(()=>location.href='/results', 600);
  }

  function startFallback(){
    if (finished) return;
    fallbackMode=true;
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
      const durationMs=Math.round(Math.max(0, performance.now()-fallbackStart));
      localStorage.setItem('jsd:bal', JSON.stringify({ mode:'touch', duration_ms:durationMs, std_px:stdPx, score }));
      localStorage.setItem('jsd:done:t4','1');
      fbStatus.textContent=t('t4.fallback_status_done');
      document.getElementById('next').classList.remove('opacity-50','pointer-events-none');
      setTimeout(()=>location.href='/results', 600);
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
    started=true; events=0; lastTs=0; values=[]; note=''; src={dm:false,do:false};
    fallbackMode=false;
    gEst={x:0,y:0,z:0}; gInit=false;
    btn.textContent=t('t4.button_measuring');
    updateMotionIndicator(0);

    if (location.protocol!=='https:' && !['localhost','127.0.0.1'].includes(location.hostname)){
      started=false; btn.textContent=t('t4.button_blocked_http'); return;
    }

    try {
      ST=await settingsPromise;
    } catch(e){
      ST=defs({});
    }

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
  updateStatus();
})();
