(function(){
  const flow = window.jsdFlow || null;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t2')){
    return;
  }
  const t=(window.i18n)||((key)=>key);
  const el=(tag,cls,html)=>{const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e;};
  const box=document.getElementById("t2");
  if(!box){return;}
  const startSection=document.getElementById("t2-start-section");
  const startButton=document.getElementById("t2-start-button");
  const CSS_COLORS=[
    {key:"red",css:"red"},
    {key:"blue",css:"blue"},
    {key:"green",css:"green"},
    {key:"yellow",css:"gold"},
    {key:"purple",css:"purple"},
    {key:"black",css:"black"}
  ];

  const style=document.createElement("style");
  style.textContent=`
    #t2 .t2-word{min-height:12rem;margin-bottom:1rem;border:4px solid rgba(255,255,255,.8);border-radius:28px;background:radial-gradient(circle at 50% 30%,#fff 0,#f5f3ff 45%,#e0e7ff 100%);box-shadow:inset 0 0 0 1px rgba(99,102,241,.14),0 24px 48px -28px rgba(79,70,229,.7);font-size:clamp(2.4rem,10vw,5.2rem);font-weight:950;letter-spacing:-.06em;transition:color 100ms ease,transform 150ms ease;}
    #t2 .t2-word::before{content:'STROOP';position:absolute;top:1rem;left:1.25rem;color:rgba(99,102,241,.35);font-size:.65rem;letter-spacing:.25em;}
    #t2 .t2-color-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem;}
    #t2 .t2-color-grid button{min-height:3.8rem;border:2px solid rgba(148,163,184,.22);border-radius:18px;background:rgba(255,255,255,.88);box-shadow:0 12px 20px -16px rgba(15,23,42,.65);font-size:1rem;font-weight:950;transition:transform 120ms ease,box-shadow 120ms ease,filter 120ms ease;touch-action:manipulation;}
    #t2 .t2-color-grid button:not(:disabled):active{transform:translateY(1px) scale(.97);filter:brightness(.96);}
    #t2 .t2-color-grid button:disabled{opacity:.55;cursor:default;}
    #t2 .t2-round-info{display:flex;justify-content:center;margin-top:1rem;padding:.7rem 1rem;border-radius:9999px;background:rgba(224,231,255,.7);color:#3730a3;font-size:.85rem;font-weight:950;}
    html.dark #t2 .t2-word{border-color:rgba(255,255,255,.12);background:radial-gradient(circle at 50% 30%,#334155 0,#0f172a 100%);}
    html.dark #t2 .t2-color-grid button{border-color:rgba(148,163,184,.28);background:rgba(15,23,42,.78);}
    html.dark #t2 .t2-round-info{background:rgba(49,46,129,.3);color:#c7d2fe;}
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
    try{const r=await fetch('/api/settings',{cache:'no-store'});const data=await r.json();const nextCfg=defaults(data);cfg=nextCfg;if(index===0&&rec.length===0){info.textContent="0/"+cfg.rounds;}}
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
    word.style.color=truthColor.css;
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
    info.textContent = index+"/"+cfg.rounds;
    if (index >= cfg.rounds){ endTest(); return; }
    requestAnimationFrame(()=>{ nextItem(); lock=false; });
  }

  function startTest(){
    if(hasStarted){return;}
    hasStarted=true;
    if(startSection){startSection.classList.add("hidden");}
    box.classList.remove("hidden");
    grid.style.pointerEvents="";
    grid.querySelectorAll("button").forEach(b=>{b.disabled=false;});
    index=0;
    startedAt=null;
    rec=[];
    finished=false;
    lock=false;
    info.textContent="0/"+cfg.rounds;
    requestAnimationFrame(()=>{nextItem();});
  }

  CSS_COLORS.forEach((color)=>{
    const b=el("button","p-3 rounded-xl border bg-white hover:bg-gray-50 active:scale-95 dark:bg-slate-800 dark:border-slate-700");
    b.innerHTML='<span class="font-semibold" style="color:'+color.css+'">'+t(`colors.${color.key}`)+'</span>';
    b.addEventListener("click", ()=>choose(color.css));
    grid.append(b);
  });

  info.textContent="0/"+cfg.rounds;
  if(startButton){
    startButton.addEventListener("click", startTest);
  }else{
    startTest();
  }
  load();
})();
