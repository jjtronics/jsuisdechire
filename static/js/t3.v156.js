(function(){
  const t=(window.i18n)||((key)=>key);
  const el=(t,c,h)=>{const e=document.createElement(t); if(c) e.className=c; if(h) e.innerHTML=h; return e;};
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const box=document.getElementById("t3");
  const area=el("div","relative w-full max-w-xl mx-auto h-40 rounded-xl border bg-white overflow-hidden select-none dark:bg-slate-800");
  const hint=el("div","absolute inset-0 grid place-items-center pointer-events-none text-xs text-gray-400",t("t3.hint"));
  area.append(hint);
  const target=el("div","absolute w-10 h-10 rounded-full border-2"); target.style.borderColor="#10b981"; target.style.background="#ecfdf5"; area.append(target);
  const btnWrap=el("div","flex items-center justify-center mt-3",""); const btn=el("button","px-4 py-2 rounded-xl bg-black text-white",t("t3.button_start")); btnWrap.append(btn);
  const countdownWrap=el("div","mt-2 flex justify-center","");
  const countdownDisplay=el("div","flex items-center gap-2 px-5 py-2 rounded-xl border-2 border-black/80 bg-gradient-to-r from-rose-600 via-amber-500 to-yellow-400 text-white font-mono text-lg tracking-widest shadow-lg",'<span aria-hidden="true">💣</span><span class="countdown-value">--.-</span><span aria-hidden="true">s</span><span aria-hidden="true">|</span><span class="attempts-value">--</span><span aria-hidden="true">x</span><span class="sr-only countdown-aria">--.- seconds remaining, -- attempts left</span>');
  countdownDisplay.setAttribute('role','status');
  countdownDisplay.setAttribute('aria-live','polite');
  countdownWrap.append(countdownDisplay);
  const countdownValue=countdownDisplay.querySelector('.countdown-value');
  const attemptsValue=countdownDisplay.querySelector('.attempts-value');
  const countdownAria=countdownDisplay.querySelector('.countdown-aria');
  function setCountdown(ms){
    if(!countdownValue) return;
    const seconds=Math.max(0, ms)/1000;
    countdownValue.textContent=`${seconds.toFixed(1)}`;
    setAttempts();
    updateAria(seconds);
  }
  function setAttempts(){
    if(!attemptsValue){
      return;
    }
    if(!params){
      attemptsValue.textContent='--';
      updateAria();
      return;
    }
    const remaining=Math.max(0,(params.maxAttempts||0)-misses);
    attemptsValue.textContent=`${remaining}`;
  }
  function updateAria(secondsValue){
    if(!countdownAria) return;
    const secondsText=typeof secondsValue==='number' && Number.isFinite(secondsValue) ? secondsValue.toFixed(1) : '--.-';
    const attemptsText=params ? `${Math.max(0,(params.maxAttempts||0)-misses)}` : '--';
    countdownAria.textContent=`${secondsText} seconds remaining, ${attemptsText} attempts left`;
  }
  box.append(area,btnWrap,countdownWrap);

  const rand=(a,b)=>a + Math.random()*(b-a);
  async function fetchSettings(){
    try {
      const r = await fetch('/api/settings', { cache: 'no-store' });
      if (!r.ok) throw new Error('bad response');
      return await r.json();
    } catch (e) {
      return {};
    }
  }
  function withDefaults(s){
    const defaultJitter = rand(0.03, 0.07);
    const parsedTimeSpeed = parseFloat(s.prs_timeSpeed);
    const parsedDuration = parseInt(s.prs_duration_ms, 10);
    const parsedCapture = parseFloat(s.prs_captureRadius);
    const parsedJitter = parseFloat(s.prs_jitterAmp);
    const parsedMaxAttempts = parseInt(s.prs_max_attempts, 10);
    return {
      timeSpeed: Number.isFinite(parsedTimeSpeed) ? parsedTimeSpeed : 0.75,
      duration: Number.isFinite(parsedDuration) ? parsedDuration : 10000,
      captureRadius: Number.isFinite(parsedCapture) ? parsedCapture : 36,
      jitterAmp: Number.isFinite(parsedJitter) ? parsedJitter : defaultJitter,
      maxAttempts: Number.isFinite(parsedMaxAttempts) && parsedMaxAttempts > 0 ? parsedMaxAttempts : 10,
    };
  }

  // Random base freqs each run
  const baseA = rand(0.0030, 0.0050);
  const baseB = rand(0.0035, 0.0055);
  // Drifts & jitter
  const driftA = rand(0.00008, 0.00018);
  const driftB = rand(0.00008, 0.00018);
  const phase0 = rand(0, Math.PI*2);

  let start=0,raf=0,samples=[],cursor={x:0,y:0};
  let targetPos={x:0,y:0}; let running=false, finished=false; let params=null; let misses=0;

  function noise1D(t){ return Math.sin(t*0.9)*0.5 + Math.sin(t*0.27+1.3)*0.3 + Math.sin(t*0.61+2.1)*0.2; }

  function detach(){ area.style.pointerEvents="none"; }
  area.addEventListener("pointermove",(e)=>{ const r=area.getBoundingClientRect(); cursor.x=clamp(e.clientX-r.left,0,r.width); cursor.y=clamp(e.clientY-r.top,0,r.height); });

  function anim(now){
    if(finished || !params) return;
    const elapsedReal = now - start;
    const motionTime = elapsedReal * params.timeSpeed;
    const rect=area.getBoundingClientRect(); const W=Math.max(240, rect.width), H=Math.max(120, rect.height);
    const a = baseA + driftA * (motionTime/1000);
    const b = baseB + driftB * (motionTime/1000);
    const cx=W/2,cy=H/2,ax=W*0.44,ay=H*0.38;
    const jitter = params.jitterAmp * noise1D(motionTime/500);
    const x=cx + ax * Math.sin(a*motionTime*2*Math.PI + phase0) + jitter*24;
    const y=cy + ay * Math.sin(b*motionTime*2*Math.PI + Math.PI/3) + jitter*16;

    target.style.left=(x-20)+"px"; target.style.top=(y-20)+"px";
    targetPos={x,y};

    const dx=x-cursor.x, dy=y-cursor.y, d=Math.hypot(dx,dy);
    if (samples.length%2===0) samples.push(d);
    if (d<=params.captureRadius){ target.style.borderColor="#065f46"; target.style.background="#d1fae5"; } else { target.style.borderColor="#10b981"; target.style.background="#ecfdf5"; }

    setCountdown(params.duration - elapsedReal);

    if (elapsedReal>=params.duration){
      running=false; cancelAnimationFrame(raf); btn.disabled=true; btn.textContent=t("t3.button_done"); finish(); return;
    }
    raf=requestAnimationFrame(anim);
  }

  async function startRun(){
    if(finished || running) return;
    running=true; btn.disabled=true; btn.textContent=t("t3.button_loading");
    const settings = await fetchSettings();
    params = withDefaults(settings||{});
    samples=[]; misses=0; btn.textContent=t("t3.button_running");
    setAttempts();
    setCountdown(params.duration||0);
    start=performance.now(); raf=requestAnimationFrame(anim);
  }

  function finish(forcedData){
    if (finished) return; finished=true;
    let payload=null;
    if (forcedData && typeof forcedData === 'object'){
      payload = forcedData;
    } else if (samples.length>5){
      const mean=samples.reduce((a,b)=>a+b,0)/samples.length;
      const score=(100 - Math.min(100, Math.round((mean/140)*100)));
      const durationMs = params?.duration ?? 10000;
      payload = { duration_ms:durationMs, mean_error_px:mean, score };
    }
    if (!payload){
      payload = { score: 0 };
    }
    localStorage.setItem("jsd:prs", JSON.stringify(payload));
    localStorage.setItem("jsd:done:t3","1");
    document.getElementById("next").classList.remove("opacity-50","pointer-events-none");
    setTimeout(()=>location.href="/t4", 600);
    setCountdown(0);
    detach();
  }

  function tryCapture(e){
    if (!running || finished || !params) return false;
    if (e.type === "touchstart" && window.PointerEvent) return false;
    const r=area.getBoundingClientRect();
    const ex=(e.clientX??(e.touches&&e.touches[0]?.clientX))||0;
    const ey=(e.clientY??(e.touches&&e.touches[0]?.clientY))||0;
    const px=clamp(ex-r.left,0,r.width), py=clamp(ey-r.top,0,r.height);
    const d=Math.hypot(targetPos.x-px,targetPos.y-py);
    if (d<=params.captureRadius){
      running=false; cancelAnimationFrame(raf);
      const timeToCatch=performance.now()-start;
      const base=1500;
      const denom=Math.max(1, (params.duration||10000) - base);
      const score=Math.max(0, Math.min(100, Math.round(100 * (1 - (timeToCatch - base) / denom) )));
      btn.disabled=true; btn.textContent=t("t3.button_caught");
      finish({ time_to_catch_ms: timeToCatch, score }); return true;
    }
    misses += 1;
    setAttempts();
    if (misses >= (params.maxAttempts||10)){
      running=false; cancelAnimationFrame(raf);
      btn.disabled=true; btn.textContent=t("t3.button_done");
      finish({ score: 0 });
    }
    return false;
  }

  btn.addEventListener("click", startRun);
  area.addEventListener("pointerdown", tryCapture);
  area.addEventListener("touchstart", tryCapture, {passive:true});
})();