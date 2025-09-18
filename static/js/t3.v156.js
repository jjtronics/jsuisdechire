(function(){
  const el=(t,c,h)=>{const e=document.createElement(t); if(c) e.className=c; if(h) e.innerHTML=h; return e;};
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const box=document.getElementById("t3");
  const area=el("div","relative w-full max-w-xl mx-auto h-40 rounded-xl border bg-white overflow-hidden select-none dark:bg-slate-800");
  const hint=el("div","absolute inset-0 grid place-items-center pointer-events-none text-xs text-gray-400","Amène le curseur ici, puis clique Démarrer");
  area.append(hint);
  const target=el("div","absolute w-10 h-10 rounded-full border-2"); target.style.borderColor="#10b981"; target.style.background="#ecfdf5"; area.append(target);
  const btnWrap=el("div","flex items-center justify-center mt-3",""); const btn=el("button","px-4 py-2 rounded-xl bg-black text-white","Démarrer"); btnWrap.append(btn);
  box.append(area,btnWrap);

  // Much faster & more random
  const timeSpeed = 0.75; // ~x3 vs v1.5.3  => ~12x original
  const rand=(a,b)=>a + Math.random()*(b-a);
  // Random base freqs each run
  const baseA = rand(0.0030, 0.0050);
  const baseB = rand(0.0035, 0.0055);
  // Drifts & jitter
  const driftA = rand(0.00008, 0.00018);
  const driftB = rand(0.00008, 0.00018);
  const jitterAmp = rand(0.03, 0.07);
  const phase0 = rand(0, Math.PI*2);

  let start=0,raf=0,samples=[],cursor={x:0,y:0}; const duration=10000;
  let targetPos={x:0,y:0}; const captureRadius=36; let running=false, finished=false;

  function noise1D(t){ return Math.sin(t*0.9)*0.5 + Math.sin(t*0.27+1.3)*0.3 + Math.sin(t*0.61+2.1)*0.2; }

  function detach(){ area.style.pointerEvents="none"; }
  area.addEventListener("pointermove",(e)=>{ const r=area.getBoundingClientRect(); cursor.x=clamp(e.clientX-r.left,0,r.width); cursor.y=clamp(e.clientY-r.top,0,r.height); });

  function anim(now){
    if(finished) return;
    const elapsed=(now-start)*timeSpeed;
    const rect=area.getBoundingClientRect(); const W=Math.max(240, rect.width), H=Math.max(120, rect.height);
    const a = baseA + driftA * (elapsed/1000);
    const b = baseB + driftB * (elapsed/1000);
    const cx=W/2,cy=H/2,ax=W*0.44,ay=H*0.38;
    const jitter = jitterAmp * noise1D(elapsed/500);
    const x=cx + ax * Math.sin(a*elapsed*2*Math.PI + phase0) + jitter*24;
    const y=cy + ay * Math.sin(b*elapsed*2*Math.PI + Math.PI/3) + jitter*16;

    target.style.left=(x-20)+"px"; target.style.top=(y-20)+"px";
    targetPos={x,y};

    const dx=x-cursor.x, dy=y-cursor.y, d=Math.hypot(dx,dy);
    if (samples.length%2===0) samples.push(d);
    if (d<=captureRadius){ target.style.borderColor="#065f46"; target.style.background="#d1fae5"; } else { target.style.borderColor="#10b981"; target.style.background="#ecfdf5"; }

    if (elapsed>=duration){
      running=false; cancelAnimationFrame(raf); btn.disabled=true; btn.textContent="Terminé ✔"; finish(); return;
    }
    raf=requestAnimationFrame(anim);
  }

  function startRun(){
    if(finished) return;
    samples=[]; running=true; btn.disabled=true; btn.textContent="En cours…";
    start=performance.now(); raf=requestAnimationFrame(anim);
  }

  function finish(){
    if (finished) return; finished=true;
    if (samples.length>5){
      const mean=samples.reduce((a,b)=>a+b,0)/samples.length;
      const score=(100 - Math.min(100, Math.round((mean/140)*100)));
      localStorage.setItem("jsd:prs", JSON.stringify({ duration_ms:duration, mean_error_px:mean, score }));
    }
    localStorage.setItem("jsd:done:t3","1");
    document.getElementById("next").classList.remove("opacity-50","pointer-events-none");
    setTimeout(()=>location.href="/t4", 600);
    detach();
  }

  function tryCapture(e){
    if (!running || finished) return false;
    const r=area.getBoundingClientRect();
    const ex=(e.clientX??(e.touches&&e.touches[0]?.clientX))||0;
    const ey=(e.clientY??(e.touches&&e.touches[0]?.clientY))||0;
    const px=clamp(ex-r.left,0,r.width), py=clamp(ey-r.top,0,r.height);
    const d=Math.hypot(targetPos.x-px,targetPos.y-py);
    if (d<=captureRadius){
      running=false; cancelAnimationFrame(raf);
      const timeToCatch=performance.now()-start;
      const score=Math.max(0, Math.min(100, Math.round(100 * (1 - (timeToCatch - 1500) / (10000 - 1500)) )));
      localStorage.setItem("jsd:prs", JSON.stringify({ time_to_catch_ms: timeToCatch, score }));
      btn.disabled=true; btn.textContent="Attrapé ! ✔";
      finish(); return true;
    }
    return false;
  }

  btn.addEventListener("click", startRun);
  area.addEventListener("pointerdown", tryCapture);
  area.addEventListener("click", tryCapture);
  area.addEventListener("touchstart", tryCapture, {passive:true});
})();