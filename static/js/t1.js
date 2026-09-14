(function(){
  const flow = window.jsdFlow || null;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t1')){
    return;
  }
  const t=(window.i18n)||((key)=>key);
  const el=(tag,cls,html)=>{const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e;};
  const BASE_CLASS="h-36 rounded-xl flex items-center justify-center text-lg font-semibold cursor-pointer select-none transition-colors bg-gray-100 dark:bg-slate-800";
  const container=document.getElementById("t1");
  const area=container.appendChild(el("div",BASE_CLASS,t("t1.tap_to_start")));
  area.classList.add("t1-reaction-area");

  const style=document.createElement("style");
  style.textContent=`
    #t1 .t1-reaction-area{min-height:18rem;border:4px solid rgba(255,255,255,.84);border-radius:28px;background:radial-gradient(circle at 50% 20%,#fff 0,#f8fafc 38%,#e2e8f0 100%);box-shadow:inset 0 0 0 1px rgba(148,163,184,.22),0 24px 48px -28px rgba(15,23,42,.7);color:#334155;font-size:clamp(1.05rem,3vw,1.4rem);font-weight:950;letter-spacing:-.02em;transition:background 180ms ease,transform 120ms ease,box-shadow 180ms ease;}
    #t1 .t1-reaction-area:not(.bg-green-500):not(.bg-yellow-200):active{transform:scale(.995);}
    #t1 .t1-reaction-area.bg-yellow-200{background:radial-gradient(circle at 50% 20%,#fef3c7 0,#fbbf24 100%)!important;color:#78350f;box-shadow:0 0 0 5px rgba(251,191,36,.18),0 24px 48px -24px rgba(180,83,9,.7);}
    #t1 .t1-reaction-area.bg-green-500{background:radial-gradient(circle at 50% 20%,#86efac 0,#16a34a 100%)!important;color:#fff;box-shadow:0 0 0 6px rgba(34,197,94,.2),0 0 50px rgba(34,197,94,.45);font-size:clamp(1.35rem,4vw,2rem);}
    #t1 .t1-reaction-area.opacity-60{filter:saturate(.7);box-shadow:none;}
    html.dark #t1 .t1-reaction-area:not(.bg-green-500):not(.bg-yellow-200){border-color:rgba(255,255,255,.12);background:radial-gradient(circle at 50% 20%,#334155 0,#0f172a 100%);color:#e2e8f0;}
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
