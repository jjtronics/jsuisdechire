(function(){
  const flow = window.jsdFlow || null;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t1')){
    return;
  }
  const t=(window.i18n)||((key)=>key);
  const el=(tag,cls,html)=>{const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e;};
  const BASE_CLASS="h-36 rounded-xl flex items-center justify-center text-lg font-semibold cursor-pointer select-none transition-colors bg-gray-100 dark:bg-slate-800";
  const container=document.getElementById("t1");
  const area=container.appendChild(el("button",BASE_CLASS,t("t1.tap_to_start")));
  area.type="button";
  area.setAttribute("aria-label",t("t1.tap_to_start"));
  area.classList.add("t1-reaction-area");

  const style=document.createElement("style");
  style.textContent=`
    #t1 .t1-reaction-area{position:relative;width:min(100%,24rem);height:auto;aspect-ratio:1;min-height:0;display:flex;align-items:center;justify-content:center;margin-inline:auto;padding:1.25rem;border:12px solid #171044;border-radius:50%;background:radial-gradient(ellipse at 32% 16%,rgba(255,255,255,.72) 0 4%,transparent 5%),radial-gradient(circle at 50% 42%,#fb923c 0,#f97316 52%,#c2410c 100%);box-shadow:inset 0 10px 0 rgba(255,255,255,.2),inset 0 -17px 0 rgba(124,45,18,.28),0 0 0 6px rgba(255,255,255,.58),0 12px 0 #08051f,0 26px 38px -18px rgba(2,6,23,.95);color:#fff7ed;font-size:clamp(1.15rem,3vw,1.55rem);font-weight:950;letter-spacing:-.02em;line-height:1.15;text-align:center;text-shadow:0 2px 12px rgba(76,29,149,.72);transition:background 180ms ease,transform 120ms ease,box-shadow 180ms ease,border-color 180ms ease,filter 180ms ease;}
    #t1 .t1-reaction-area::before{content:"";position:absolute;left:17%;top:12%;width:42%;height:15%;border-radius:999px;background:linear-gradient(110deg,rgba(255,255,255,.74),rgba(255,255,255,0));transform:rotate(-20deg);pointer-events:none;}
    #t1 .t1-reaction-area::after{content:"";position:absolute;inset:10px;border:2px solid rgba(255,255,255,.24);border-radius:50%;box-shadow:inset 0 -5px 0 rgba(2,6,23,.12);pointer-events:none;}
    #t1 .t1-reaction-area:not(.bg-green-500):not(.bg-yellow-200):hover{transform:translateY(-3px) rotate(-.4deg);filter:saturate(1.1);box-shadow:inset 0 10px 0 rgba(255,255,255,.24),inset 0 -17px 0 rgba(124,45,18,.28),0 0 0 8px rgba(255,255,255,.68),0 14px 0 #08051f,0 32px 46px -18px rgba(2,6,23,.95);}
    #t1 .t1-reaction-area:not(.bg-green-500):not(.bg-yellow-200):active{transform:translateY(8px) scale(.985);box-shadow:inset 0 8px 0 rgba(255,255,255,.16),inset 0 -8px 0 rgba(124,45,18,.28),0 0 0 6px rgba(255,255,255,.58),0 4px 0 #08051f,0 14px 24px -16px rgba(2,6,23,.9);}
    #t1 .t1-reaction-area.bg-yellow-200{border-color:#171044;background:radial-gradient(ellipse at 32% 16%,rgba(255,255,255,.8) 0 4%,transparent 5%),radial-gradient(circle at 50% 42%,#fcd34d 0,#f59e0b 52%,#ea580c 100%)!important;color:#fff7ed;box-shadow:inset 0 10px 0 rgba(255,255,255,.22),inset 0 -17px 0 rgba(124,45,18,.3),0 0 0 8px rgba(251,191,36,.3),0 12px 0 #08051f,0 0 55px rgba(249,115,22,.55);animation:t1WaitingPulse 1.1s ease-in-out infinite;}
    #t1 .t1-reaction-area.bg-green-500{border-color:#171044;background:radial-gradient(ellipse at 32% 16%,rgba(255,255,255,.84) 0 4%,transparent 5%),radial-gradient(circle at 50% 42%,#bef264 0,#22c55e 52%,#15803d 100%)!important;color:#f0fdf4;box-shadow:inset 0 10px 0 rgba(255,255,255,.22),inset 0 -17px 0 rgba(20,83,45,.3),0 0 0 10px rgba(190,242,100,.34),0 12px 0 #08051f,0 0 78px rgba(74,222,128,.9);font-size:clamp(1.35rem,4vw,2rem);text-shadow:0 2px 12px rgba(2,46,22,.8);animation:t1GoPop .24s cubic-bezier(.2,.8,.2,1);filter:saturate(1.2) brightness(1.08);}
    #t1 .t1-reaction-area.opacity-60{filter:saturate(.7);box-shadow:none;}
    html.dark #t1 .t1-reaction-area:not(.bg-green-500):not(.bg-yellow-200){border-color:rgba(255,255,255,.22);color:#ffffff;}
    @keyframes t1WaitingPulse{0%,100%{transform:scale(1)}50%{transform:scale(.992)}}
    @keyframes t1GoPop{0%{transform:scale(.97) rotate(-.5deg)}100%{transform:scale(1) rotate(0)}}
  `;
  document.head.appendChild(style);

  function normInt(v,f){const n=parseInt(v,10);return Number.isFinite(n)?n:f;}
  function normFloat(v,f){if(v==null)return f;const n=parseFloat(String(v).replace(',','.'));return Number.isFinite(n)?n:f;}
  function defaults(s){
    return {
      trials: Math.max(1, normInt(s.rxn_trials, 5)),
      waitMin: Math.max(0, normInt(s.rxn_wait_min_ms, 1000)),
      waitRange: Math.max(0, normInt(s.rxn_wait_range_ms, 2500)),
      falseMin: Math.max(0, normInt(s.rxn_false_penalty_min_ms, 1000)),
      falseRange: Math.max(0, normInt(s.rxn_false_penalty_range_ms, 500)),
      bestMedian: Math.max(1, normFloat(s.rxn_median_best_ms, 250)),
      worstMedian: Math.max(1, normFloat(s.rxn_median_worst_ms, 500))
    };
  }

  let cfg=defaults({});
  async function load(){
    try{const r=await fetch('/api/settings',{cache:'no-store'});const data=await r.json();cfg=defaults(data);}catch(e){/* ignore */}}

  let phase="intro",trial=0,values=[],start=0,timer=null,finished=false;

  function beep(){try{const C=(window.AudioContext||window.webkitAudioContext);if(!C)return;const c=new C();const o=c.createOscillator();const g=c.createGain();o.type="triangle";o.frequency.value=880;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(0.001,c.currentTime);g.gain.exponentialRampToValueAtTime(0.2,c.currentTime+0.01);o.start();setTimeout(()=>{g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.02);o.stop(c.currentTime+0.03);},100);}catch(e){}}

  function restoreIdle(){area.className=BASE_CLASS+" t1-reaction-area"; area.style.backgroundColor=""; area.style.color="";}
  function progressLabel(){return t("t1.tap_with_progress",{current:trial,total:cfg.trials});}

  function computeScore(median){
    const best=cfg.bestMedian;
    const worst=cfg.worstMedian;
    if(worst<=best){return median<=best?100:0;}
    const span=worst-best;
    const normalized=1-((median-best)/span);
    const clamped=Math.max(0,Math.min(1,normalized));
    return Math.round(clamped*100);
  }

  function median(arr){const copy=arr.slice().sort((a,b)=>a-b);const mid=Math.floor((copy.length-1)/2);if(copy.length%2===1){return copy[mid];}const upper=copy[mid+1]??copy[mid];return (copy[mid]+upper)/2;}

  function schedule(){
    phase="wait";
    area.classList.remove("bg-green-500","text-white");
    area.classList.add("bg-yellow-200");
    area.textContent=t("t1.wait");
    const delay=cfg.waitMin+Math.random()*cfg.waitRange;
    timer=setTimeout(()=>{
      phase="go";
      start=performance.now();
      area.classList.remove("bg-yellow-200","dark:bg-slate-800","bg-gray-100");
      area.classList.add("bg-green-500","text-white");
      area.style.backgroundColor="#22c55e";
      area.style.color="white";
      area.textContent=t("t1.go");
      beep();
    }, Math.max(0, delay));
  }

  function done(){
    finished=true;
    clearTimeout(timer);
    const recent=values.slice(-cfg.trials);
    if(!recent.length)return;
    const med=median(recent);
    const mean=recent.reduce((a,b)=>a+b,0)/recent.length;
    const score=computeScore(med);
    if(window.jsdSession && typeof window.jsdSession.invalidateSubmission==='function'){
      window.jsdSession.invalidateSubmission();
    }else{
      try{localStorage.removeItem('jsd:score_submitted');localStorage.removeItem('jsd:last_submission');}catch(err){}
    }
    localStorage.setItem("jsd:rxn", JSON.stringify({trials:cfg.trials, values:recent, median:med, mean, score}));
    localStorage.setItem("jsd:done:t1","1");
    const next=document.getElementById("next");
    if(next){next.classList.remove("opacity-50","pointer-events-none");}
    area.classList.add("opacity-60");
    area.style.cursor="default";
    area.textContent=t("t1.done");
    const nextRoute = flow && typeof flow.nextRoute === 'function' ? flow.nextRoute('t1') : '/t2';
    setTimeout(()=>{ location.href = nextRoute; },600);
  }

  area.addEventListener("click",()=>{
    if(finished)return;
    if(phase==="intro"){
      if(trial>=cfg.trials)return;
      schedule();
    }else if(phase==="wait"){
      clearTimeout(timer);
      values.push(cfg.falseMin+Math.random()*cfg.falseRange);
      trial=Math.min(trial+1,cfg.trials);
      phase="intro";
      restoreIdle();
      area.textContent=progressLabel();
      if(trial>=cfg.trials) done();
    }else if(phase==="go"){
      const rt=performance.now()-start;
      values.push(rt);
      trial=Math.min(trial+1,cfg.trials);
      phase="intro";
      restoreIdle();
      area.textContent=progressLabel();
      if(trial>=cfg.trials) done();
    }
  });

  load();
})();
