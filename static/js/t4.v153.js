(function(){
  const G = 9.80665; // m/s^2 -> g
  const el=(t,c,h)=>{const e=document.createElement(t); if(c) e.className=c; if(h) e.innerHTML=h; return e;};
  const box=document.getElementById("t4");
  const info=el("div","text-sm text-gray-500","Tiens le téléphone à plat, bras tendus, 8s. Appuie sur Démarrer.");
  const btn=el("button","px-4 py-2 rounded-xl bg-black text-white","Démarrer 8s");
  const dbg=el("pre","text-[11px] leading-tight bg-gray-50 dark:bg-slate-900/40 p-2 rounded border border-white/20 overflow-x-auto","");
  dbg.style.whiteSpace="pre-wrap";
  const fallbackWrap=el("div","hidden mt-3");
  box.append(info,btn,dbg,fallbackWrap);

  let started=false, finished=false, events=0, lastTs=0, values=[], note="", src={dm:false, do:false};
  let watchdog=null, endTimer=null, fallbackMode=false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);

  function updateDbg(extra=""){
    const lines=[
      `HTTPS: ${location.protocol==='https:'}`,
      `SecureContext: ${!!window.isSecureContext}`,
      `UA: ${navigator.userAgent}`,
      `Events: ${events}`,
      `LastEvent(ms): ${Math.round(lastTs)}`,
      `Src: dm=${src.dm} do=${src.do}`,
      note?`Note: ${note}`:""
    ]; if(extra) lines.push(extra);
    dbg.textContent=lines.filter(Boolean).join("\n");
  }
  function pushVal(v){ if(finished) return; values.push(v); events++; lastTs=performance.now(); }

  function onDev(e){
    src.dm=true;
    const a=e.accelerationIncludingGravity||e.acceleration||{x:0,y:0,z:0};
    // Convert magnitude to g
    const m=Math.hypot(a.x||0,a.y||0,a.z||0)/G;
    pushVal(m);
  }
  function onOri(e){ src.do=true; /* no-op in std calculation */ }

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
    detachAll(); updateDbg('stop:'+reason);
  }

  function sensorsSuccess(){
    if (finished) return;
    finished=true;
    stopAll('finish');
    // Compute std over g-units
    const mean=values.reduce((a,b)=>a+b,0)/Math.max(1,values.length);
    const variance=values.reduce((a,b)=>a+Math.pow(b-mean,2),0)/Math.max(1,values.length);
    const std=Math.sqrt(variance);
    // Scoring window (better: 0.01g => 100, 0.20g => 0)
    let s;
    if (std <= 0.5) {
      s = 95 + (0.5 - Math.max(0,std)) / 0.5 * 5; // [95..100]
    } else if (std <= 1.0) {
      // 0.5 -> 95 down to 1.0 -> 30
      s = 95 - (std - 0.5) / 0.5 * (95 - 30);
    } else {
      // 1.0 -> 30 down to 2.0 -> 0
      s = 30 * (1 - (std - 1.0) / (2.0 - 1.0));
    }
    s = Math.max(0, Math.min(100, Math.round(s)));
    localStorage.setItem('jsd:bal', JSON.stringify({ mode:'sensors', duration_ms:8000, std_g:std, score:s }));
    localStorage.setItem('jsd:done:t4','1');
    btn.textContent='Terminé ✔';
    document.getElementById('next').classList.remove('opacity-50','pointer-events-none');
    setTimeout(()=>location.href='/results', 600);
  }

  function startFallback(){
    if (finished) return;
    fallbackMode=true;
    info.textContent='Fallback : maintiens un doigt au centre du cercle pendant 8s.';
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
    const status=el('div','mt-2 text-center text-sm','Pose ton doigt pour démarrer');
    area.append(circle); fallbackWrap.append(area, status); fallbackWrap.classList.remove('hidden');

    let running=false, points=[]; let center=null; let timer=null;
    const dist=(a,b)=>Math.hypot(a.x-b.x, a.y-b.y);
    function finishTouch(){
      if (finished) return;
      running=false; clearTimeout(timer);
      if (points.length<32){ status.textContent='Mesure trop courte. Recommence.'; return; }
      const dists=points.map(p=>dist(p, center));
      const mean=dists.reduce((a,b)=>a+b,0)/dists.length;
      const variance=dists.reduce((a,b)=>a+Math.pow(b-mean,2),0)/dists.length;
      const stdPx=Math.sqrt(variance);
      const score=Math.max(0, Math.min(100, Math.round(100*(1-(stdPx-4)/(20-4)))));
      finished=true;
      localStorage.setItem('jsd:bal', JSON.stringify({ mode:'touch', duration_ms:8000, std_px:stdPx, score }));
      localStorage.setItem('jsd:done:t4','1');
      status.textContent='Terminé ✔';
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
      running=true; status.textContent='Mesure en cours…';
      timer=setTimeout(finishTouch, 8000);
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
    btn.textContent='Mesure en cours…';

    if (location.protocol!=='https:' && !['localhost','127.0.0.1'].includes(location.hostname)){
      started=false; btn.textContent='Bloqué en HTTP — passe en HTTPS'; return;
    }

    if (isIOS){
      try{
        if (typeof DeviceMotionEvent!=='undefined' && typeof DeviceMotionEvent.requestPermission==='function'){
          const pm=await DeviceMotionEvent.requestPermission(); if(pm!=='granted'){ note='iOS motion denied'; updateDbg(); startFallback(); return; }
        }
        if (typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
          const po=await DeviceOrientationEvent.requestPermission(); if(po!=='granted'){ note='iOS orientation denied'; updateDbg(); startFallback(); return; }
        }
      }catch(e){ note='iOS permission error'; updateDbg(); startFallback(); return; }
    }

    attachBasic();

    const t0=performance.now();
    watchdog=setInterval(()=>{
      updateDbg();
      const elapsed=performance.now()-t0;
      if (!fallbackMode && !finished && events===0 && elapsed>1500){
        stopAll('noevents'); startFallback();
      }
    }, 300);

    endTimer=setTimeout(()=>{
      if (finished || fallbackMode) return;
      if (events > 0) sensorsSuccess();
      else { stopAll('timeout-noevents'); startFallback(); }
    }, 8000);
  }

  btn.addEventListener('click', start);
  updateDbg();
})();