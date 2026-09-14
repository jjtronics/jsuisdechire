(function(){
  const flow = window.jsdFlow || null;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t2')){
    return;
  }
  const t=(window.i18n)||((key)=>key);
  const el=(tag,cls,html)=>{const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e;};
  const box=document.getElementById("t2");
  if(!box){return;}
  const board=document.getElementById("t2-board");
  const startSection=document.getElementById("t2-start-section");
  const startButton=document.getElementById("t2-start-button");
  const CSS_COLORS=[
    {key:"red",css:"red",hex:"#ef4444",deep:"#b91c1c",light:"#fecaca"},
    {key:"blue",css:"blue",hex:"#3b82f6",deep:"#1d4ed8",light:"#bfdbfe"},
    {key:"green",css:"green",hex:"#22c55e",deep:"#15803d",light:"#bbf7d0"},
    {key:"yellow",css:"gold",hex:"#facc15",deep:"#ca8a04",light:"#fef08a"},
    {key:"purple",css:"purple",hex:"#a855f7",deep:"#7e22ce",light:"#e9d5ff"},
    {key:"black",css:"black",hex:"#334155",deep:"#0f172a",light:"#cbd5e1"}
  ];

  const style=document.createElement("style");
  style.textContent=`
    #t2 .t2-word{position:relative;min-height:12rem;margin-bottom:1rem;border:5px solid #171044;border-radius:1.75rem;background:radial-gradient(circle at 24% 18%,rgba(255,255,255,.95) 0 4%,transparent 5%),linear-gradient(145deg,#fff7ed,#fdf2f8 48%,#e0e7ff);box-shadow:inset 0 8px 0 rgba(255,255,255,.7),0 8px 0 #08051f,0 22px 34px -24px rgba(2,6,23,.9);font-size:clamp(2.4rem,10vw,5.2rem);font-weight:950;letter-spacing:-.06em;transition:color 100ms ease,transform 150ms ease,box-shadow 150ms ease;}
    #t2 .t2-word::before{content:'STROOP';position:absolute;top:1rem;left:1.25rem;color:rgba(99,102,241,.38);font-size:.65rem;letter-spacing:.25em;}
    #t2 .t2-word::after{content:'';position:absolute;right:1.1rem;bottom:1rem;width:3.5rem;height:1.8rem;border-radius:48% 52% 44% 56%;background:rgba(236,72,153,.2);transform:rotate(-18deg);}
    #t2 .t2-color-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem;}
    #t2 .t2-color-grid button{position:relative;isolation:isolate;min-height:5.5rem;overflow:hidden;border:5px solid #171044;border-radius:1.25rem;background:linear-gradient(145deg,var(--paint-light),var(--paint) 42%,var(--paint-deep));box-shadow:inset 0 7px 0 rgba(255,255,255,.28),0 7px 0 #08051f,0 18px 25px -18px rgba(2,6,23,.9);color:#fff;font-size:1rem;font-weight:950;text-shadow:0 2px 5px rgba(15,23,42,.38);transition:transform 120ms ease,box-shadow 120ms ease,filter 120ms ease;touch-action:manipulation;}
    #t2 .t2-color-grid button::before,#t2 .t2-color-grid button::after{content:'';position:absolute;z-index:-1;border-radius:999px;background:rgba(255,255,255,.3);}
    #t2 .t2-color-grid button::before{left:10%;top:14%;width:1.5rem;height:1rem;transform:rotate(-24deg);}
    #t2 .t2-color-grid button::after{right:11%;bottom:12%;width:.7rem;height:.7rem;background:rgba(15,23,42,.22);}
    #t2 .t2-color-grid button:nth-child(2n){transform:rotate(1.2deg);}
    #t2 .t2-color-grid button:nth-child(3n){transform:rotate(-1.1deg);}
    #t2 .t2-color-grid button:not(:disabled):hover{transform:translateY(-3px) rotate(0);filter:saturate(1.1);box-shadow:inset 0 7px 0 rgba(255,255,255,.34),0 10px 0 #08051f,0 22px 28px -18px rgba(2,6,23,.95);}
    #t2 .t2-color-grid button:not(:disabled):active{transform:translateY(5px) scale(.97) rotate(0);filter:brightness(.96);box-shadow:inset 0 5px 0 rgba(255,255,255,.2),0 2px 0 #08051f;}
    #t2 .t2-color-grid button:disabled{opacity:.55;cursor:default;filter:grayscale(.45);}
    #t2 .t2-round-info{display:flex;justify-content:center;margin-top:1rem;padding:.7rem 1rem;border:2px solid rgba(255,255,255,.14);border-radius:9999px;background:rgba(224,231,255,.12);color:#e0e7ff;font-size:.85rem;font-weight:950;}
    html.dark #t2 .t2-word{border-color:#171044;background:radial-gradient(circle at 24% 18%,rgba(255,255,255,.95) 0 4%,transparent 5%),linear-gradient(145deg,#fff7ed,#fdf2f8 48%,#e0e7ff);}
    @media(max-width:520px){#t2 .t2-color-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
  `;
  document.head.appendChild(style);

  const word=el("div","t2-word relative flex items-center justify-center select-none","");
  const grid=el("div","t2-color-grid");
  const info=el("div","t2-round-info","0/8");
  box.append(word,grid,info);

  function normInt(v,f){const n=parseInt(v,10);return Number.isFinite(n)?n:f;}
  function normFloat(v,f){if(v==null)return f;const n=parseFloat(String(v).replace(',','.'));return Number.isFinite(n)?n:f;}
  function defaults(s){
    const rounds=Math.max(1, normInt(s.str_rounds, 8));
    const accWeight=Math.max(0, normFloat(s.str_acc_weight, 0.6));
    const speedWeight=Math.max(0, normFloat(s.str_speed_weight, 0.4));
    const best=Math.max(1, normFloat(s.str_speed_best_ms, 700));
    const worstCandidate=normFloat(s.str_speed_worst_ms, 1400);
    const worst=Math.max(best+1, worstCandidate||1400);
    return { rounds, accWeight, speedWeight, best, worst };
  }

  let cfg=defaults({});
  async function load(){
    try{const r=await fetch('/api/settings',{cache:'no-store'});const data=await r.json();const nextCfg=defaults(data);cfg=nextCfg;if(index===0&&rec.length===0){info.textContent=t("t2.round",{current:0,total:cfg.rounds});}}
    catch(e){/* ignore */}
  }

  function scoreFromMean(mean){
    if(cfg.worst<=cfg.best){return mean<=cfg.best?100:0;}
    const span=cfg.worst-cfg.best;
    const normalized=1-((mean-cfg.best)/span);
    const clamped=Math.max(0,Math.min(1,normalized));
    return clamped*100;
  }

  function computeScore(acc, mean){
    const accScore=Math.max(0,Math.min(1,acc))*100;
    const meanScore=scoreFromMean(mean);
    const sumWeights=cfg.accWeight+cfg.speedWeight;
    const accW=sumWeights>0?cfg.accWeight/sumWeights:0.5;
    const speedW=sumWeights>0?cfg.speedWeight/sumWeights:0.5;
    return Math.round(accW*accScore+speedW*meanScore);
  }

  let index=0, startedAt=null, rec=[], finished=false, lock=false, hasStarted=false;

  function nextItem(){
    const wIdx=Math.floor(Math.random()*CSS_COLORS.length);
    const cIdx=Math.floor(Math.random()*CSS_COLORS.length);
    const wordColor=CSS_COLORS[wIdx];
    const truthColor=CSS_COLORS[cIdx];
    word.textContent=t(`colors.${wordColor.key}`);
    word.style.color=truthColor.hex;
    word.dataset.trueColor=truthColor.css;
    startedAt=performance.now();
  }

  function hardDisable(){
    finished=true; lock=true;
    grid.style.pointerEvents="none";
    grid.querySelectorAll("button").forEach(b=>b.disabled=true);
  }

  function endTest(){
    hardDisable();
    const rounds=cfg.rounds;
    const acc=rounds>0?rec.filter(x=>x.ok).length/rounds:0;
    const mean=rounds>0?rec.reduce((a,b)=>a+(b.dt||0),0)/rounds:0;
    const score=computeScore(acc, mean);
    if(window.jsdSession && typeof window.jsdSession.invalidateSubmission==='function'){
      window.jsdSession.invalidateSubmission();
    }else{
      try{localStorage.removeItem('jsd:score_submitted');localStorage.removeItem('jsd:last_submission');}catch(err){}
    }
    localStorage.setItem("jsd:str", JSON.stringify({rounds,accuracy:acc,mean,score}));
    localStorage.setItem("jsd:done:t2","1");
    const next=document.getElementById("next");
    if(next){next.classList.remove("opacity-50","pointer-events-none");}
    const nextRoute = flow && typeof flow.nextRoute === 'function' ? flow.nextRoute('t2') : '/t3';
    setTimeout(()=>{ location.href = nextRoute; }, 500);
  }

  function choose(cssColor){
    if (finished || lock) return;
    if(!hasStarted){return;}
    if (index >= cfg.rounds){ endTest(); return; }
    lock = true;
    const dt=startedAt?performance.now()-startedAt:null;
    const ok=cssColor===word.dataset.trueColor;
    rec.push({ok,dt});
    index = Math.min(index+1, cfg.rounds);
    info.textContent = t("t2.round",{current:index,total:cfg.rounds});
    if (index >= cfg.rounds){ endTest(); return; }
    requestAnimationFrame(()=>{ nextItem(); lock=false; });
  }

  function startTest(){
    if(hasStarted){return;}
    hasStarted=true;
    if(startSection){startSection.classList.add("hidden");}
    if(board){board.classList.remove("hidden");}
    box.classList.remove("hidden");
    grid.style.pointerEvents="";
    grid.querySelectorAll("button").forEach(b=>{b.disabled=false;});
    index=0;
    startedAt=null;
    rec=[];
    finished=false;
    lock=false;
    info.textContent=t("t2.round",{current:0,total:cfg.rounds});
    requestAnimationFrame(()=>{nextItem();});
  }

  CSS_COLORS.forEach((color)=>{
    const b=el("button","t2-color-card");
    b.style.setProperty("--paint",color.hex);
    b.style.setProperty("--paint-deep",color.deep);
    b.style.setProperty("--paint-light",color.light);
    b.innerHTML='<span>'+t(`colors.${color.key}`)+'</span>';
    b.addEventListener("click", ()=>choose(color.css));
    grid.append(b);
  });

  info.textContent=t("t2.round",{current:0,total:cfg.rounds});
  if(startButton){
    startButton.addEventListener("click", startTest);
  }else{
    startTest();
  }
  load();
})();
