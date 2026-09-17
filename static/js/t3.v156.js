(function(){
  const flow = window.jsdFlow || null;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t3')){
    return;
  }
  const t=(window.i18n)||((key)=>key);
  const el=(t,c,h)=>{const e=document.createElement(t); if(c) e.className=c; if(h) e.innerHTML=h; return e;};
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const box=document.getElementById("t3");
  const style=document.createElement("style");
  style.textContent=`
    #t3 .t3-arena{position:relative;width:100%;max-width:34rem;height:22rem;margin:0 auto;overflow:hidden;border:4px solid rgba(255,255,255,.82);border-radius:28px;background:radial-gradient(circle at 50% 50%,rgba(34,211,238,.14),transparent 34%),linear-gradient(135deg,#0f172a,#172554 55%,#164e63);box-shadow:inset 0 0 0 1px rgba(125,211,252,.24),0 24px 48px -25px rgba(8,47,73,.9);touch-action:none;}
    #t3 .t3-arena::before{content:'';position:absolute;inset:10%;border:1px dashed rgba(125,211,252,.28);border-radius:50%;box-shadow:0 0 0 2rem rgba(34,211,238,.025),0 0 0 5rem rgba(34,211,238,.02);}
    #t3 .t3-hint{z-index:1;color:rgba(224,242,254,.7);font-size:.85rem;font-weight:800;letter-spacing:.02em;}
    #t3 .t3-target{z-index:2;display:grid;place-items:center;width:4.25rem;height:4.25rem;border:0!important;background:transparent!important;box-shadow:none!important;transition:transform 90ms ease;}
    #t3 .t3-target::before{content:'';position:absolute;inset:3px;border:1px solid rgba(251,191,36,.48);border-radius:50%;background:rgba(251,191,36,.08);box-shadow:0 0 0 7px rgba(251,191,36,.11),0 0 30px rgba(251,191,36,.35);transition:background 120ms ease,box-shadow 120ms ease;}
    #t3 .t3-target.is-near::before{background:rgba(134,239,172,.16);box-shadow:0 0 0 7px rgba(34,197,94,.2),0 0 32px rgba(34,197,94,.62);}
    #t3 .t3-pitcher{position:relative;z-index:1;display:block;width:58%;height:70%;transform:rotate(-7deg);filter:drop-shadow(0 5px 5px rgba(15,23,42,.42));}
    #t3 .t3-pitcher-body{position:absolute;left:14%;right:8%;bottom:4%;height:72%;border:2px solid #fef3c7;border-radius:.22rem .22rem .45rem .45rem;background:linear-gradient(100deg,#fef3c7 0 13%,#fbbf24 14% 38%,#d97706 72%,#92400e 100%);box-shadow:inset .25rem 0 rgba(255,255,255,.2),inset -.2rem 0 rgba(120,53,15,.3);}
    #t3 .t3-pitcher-body::before{content:'';position:absolute;left:7%;right:7%;bottom:8%;height:47%;border-radius:.12rem .12rem .3rem .3rem;background:linear-gradient(90deg,#fde68a,#f59e0b 70%,#b45309);}
    #t3 .t3-pitcher-foam{position:absolute;z-index:2;left:9%;right:3%;top:12%;height:25%;border:2px solid #fff7ed;border-radius:50%;background:radial-gradient(circle at 18% 44%,#fff 0 18%,transparent 19%),radial-gradient(circle at 44% 34%,#fff 0 20%,transparent 21%),radial-gradient(circle at 71% 53%,#fff 0 18%,transparent 19%),#fef3c7;box-shadow:0 2px 3px rgba(120,53,15,.25);}
    #t3 .t3-pitcher-handle{position:absolute;z-index:0;right:-8%;top:28%;width:32%;height:39%;border:3px solid #f59e0b;border-left:0;border-radius:0 55% 55% 0;box-shadow:inset -2px 0 #fde68a;}
    #t3 .t3-pitcher-shine{position:absolute;z-index:3;left:25%;top:43%;width:7%;height:20%;border-radius:99px;background:rgba(255,255,255,.7);}
    #t3 .t3-countdown{display:flex;justify-content:center;margin-bottom:1rem;}
    #t3 .t3-countdown-display{border:1px solid rgba(244,63,94,.35)!important;border-radius:9999px!important;background:linear-gradient(90deg,#be123c,#f97316)!important;box-shadow:0 14px 28px -18px rgba(190,24,93,.8)!important;font-family:Inter,system-ui,sans-serif!important;font-size:.9rem!important;font-weight:950!important;letter-spacing:.04em!important;}
    #t3 .t3-start{min-height:3.2rem;min-width:12rem;border-radius:16px;background:linear-gradient(135deg,#06b6d4,#2563eb);font-weight:950;box-shadow:0 16px 28px -18px rgba(37,99,235,.9);}
    html.dark #t3 .t3-arena{border-color:rgba(255,255,255,.12);}
    @media(max-width:520px){#t3 .t3-arena{height:18rem;}}
  `;
  document.head.appendChild(style);
  const area=el("div","t3-arena");
  const hint=el("div","t3-hint absolute inset-0 grid place-items-center pointer-events-none",t("t3.hint"));
  area.append(hint);
  const target=el("div","t3-target absolute"); target.setAttribute("aria-hidden","true"); const pitcher=el("span","t3-pitcher"); pitcher.append(el("span","t3-pitcher-handle"),el("span","t3-pitcher-body"),el("span","t3-pitcher-foam"),el("span","t3-pitcher-shine")); target.append(pitcher); area.append(target);
  const btnWrap=el("div","flex items-center justify-center mt-4",""); const btn=el("button","t3-start px-4 py-2 rounded-xl text-white",t("t3.button_start")); btnWrap.append(btn);
  const countdownWrap=el("div","t3-countdown");
  const countdownDisplay=el("div","t3-countdown-display flex items-center gap-2 px-5 py-2 text-white",'<span aria-hidden="true">⏱</span><span class="countdown-value">--.-</span><span aria-hidden="true">s</span><span aria-hidden="true">·</span><span class="attempts-value">--</span><span aria-hidden="true">×</span><span class="sr-only countdown-aria">--.- seconds remaining, -- attempts left</span>');
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
  box.append(countdownWrap,area,btnWrap);

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
    const parsedDiameter = parseInt(s.prs_target_diameter, 10);
    const parsedJitter = parseFloat(s.prs_jitterAmp);
    const parsedMaxAttempts = parseInt(s.prs_max_attempts, 10);
    return {
      timeSpeed: Number.isFinite(parsedTimeSpeed) ? parsedTimeSpeed : 0.75,
      duration: Number.isFinite(parsedDuration) ? parsedDuration : 10000,
      captureRadius: Number.isFinite(parsedCapture) ? parsedCapture : 36,
      targetDiameter: Number.isFinite(parsedDiameter) ? clamp(parsedDiameter, 24, 140) : 68,
      jitterAmp: Number.isFinite(parsedJitter) ? parsedJitter : defaultJitter,
      maxAttempts: Number.isFinite(parsedMaxAttempts) && parsedMaxAttempts > 0 ? parsedMaxAttempts : 10,
    };
  }

  let start=0,raf=0,samples=[],cursor={x:0,y:0};
  let targetPos={x:0,y:0}; let running=false, finished=false; let params=null; let misses=0;
  let motion={x:0,y:0,vx:0,vy:0,desiredVx:0,desiredVy:0,nextTurn:0,lastFrame:0};

  // The pitcher follows short, randomly steered bursts instead of a repeating orbit.
  // Velocity eases toward each new direction so it remains catchable on touch screens.
  function resetMotion(now, W, H){
    const half=params.targetDiameter/2;
    const speedScale=clamp(params.timeSpeed/0.75,0.55,1.7);
    const angle=rand(0,Math.PI*2);
    const speed=rand(120,175)*speedScale;
    motion={
      x:rand(half+12,W-half-12), y:rand(half+12,H-half-12),
      vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
      desiredVx:Math.cos(angle)*speed, desiredVy:Math.sin(angle)*speed,
      nextTurn:now+rand(360,820), lastFrame:now
    };
  }
  function moveTarget(now,W,H){
    const half=params.targetDiameter/2;
    const dt=clamp((now-motion.lastFrame)/1000,0,0.045);
    motion.lastFrame=now;
    const speedScale=clamp(params.timeSpeed/0.75,0.55,1.7);
    if(now>=motion.nextTurn){
      const currentAngle=Math.atan2(motion.vy,motion.vx);
      // Most turns keep momentum; occasional reversals prevent an easy repeating loop.
      const turn=rand(-1.75,1.75)+(Math.random()<0.18 ? (Math.random()<.5?-1:1)*1.35 : 0);
      const speed=rand(105,230)*speedScale;
      motion.desiredVx=Math.cos(currentAngle+turn)*speed;
      motion.desiredVy=Math.sin(currentAngle+turn)*speed;
      motion.nextTurn=now+rand(300,920);
    }
    const easing=1-Math.exp(-5.2*dt);
    motion.vx+=(motion.desiredVx-motion.vx)*easing;
    motion.vy+=(motion.desiredVy-motion.vy)*easing;
    motion.x+=motion.vx*dt;
    motion.y+=motion.vy*dt;
    const minX=half+8,maxX=W-half-8,minY=half+8,maxY=H-half-8;
    if(motion.x<minX||motion.x>maxX){motion.x=clamp(motion.x,minX,maxX);motion.vx*=-1;motion.desiredVx*=-1;}
    if(motion.y<minY||motion.y>maxY){motion.y=clamp(motion.y,minY,maxY);motion.vy*=-1;motion.desiredVy*=-1;}
    return {x:motion.x,y:motion.y};
  }

  function detach(){ area.style.pointerEvents="none"; }
  area.addEventListener("pointermove",(e)=>{ const r=area.getBoundingClientRect(); cursor.x=clamp(e.clientX-r.left,0,r.width); cursor.y=clamp(e.clientY-r.top,0,r.height); });

  function anim(now){
    if(finished || !params) return;
    const elapsedReal = now - start;
    const rect=area.getBoundingClientRect(); const W=Math.max(240, rect.width), H=Math.max(120, rect.height);
    const {x,y}=moveTarget(now,W,H);

    const half=params.targetDiameter/2;
    target.style.left=(x-half)+"px"; target.style.top=(y-half)+"px";
    targetPos={x,y};

    const dx=x-cursor.x, dy=y-cursor.y, d=Math.hypot(dx,dy);
    if (samples.length%2===0) samples.push(d);
    target.classList.toggle("is-near", d<=params.captureRadius);

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
    target.style.width=`${params.targetDiameter}px`; target.style.height=`${params.targetDiameter}px`;
    samples=[]; misses=0; btn.textContent=t("t3.button_running");
    setAttempts();
    setCountdown(params.duration||0);
    start=performance.now();
    const rect=area.getBoundingClientRect();
    resetMotion(start,Math.max(240,rect.width),Math.max(120,rect.height));
    raf=requestAnimationFrame(anim);
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
    if(window.jsdSession && typeof window.jsdSession.invalidateSubmission==='function'){
      window.jsdSession.invalidateSubmission();
    }else{
      try{localStorage.removeItem('jsd:score_submitted');localStorage.removeItem('jsd:last_submission');}catch(err){}
    }
    localStorage.setItem("jsd:prs", JSON.stringify(payload));
    localStorage.setItem("jsd:done:t3","1");
    document.getElementById("next").classList.remove("opacity-50","pointer-events-none");
    setCountdown(0);
    detach();
    if (window.jsdConfig && window.jsdConfig.training) return;
    const nextRoute = flow && typeof flow.nextRoute === 'function' ? flow.nextRoute('t3') : '/t4';
    setTimeout(()=>{ location.href = nextRoute; }, 600);
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
