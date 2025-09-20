(function(){
  const t=(window.i18n)||((key)=>key);
  const el=(tag,cls,html)=>{const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e;};
  const box=document.getElementById("t2");
  const CSS_COLORS=[
    {key:"red",css:"red"},
    {key:"blue",css:"blue"},
    {key:"green",css:"green"},
    {key:"yellow",css:"gold"},
    {key:"purple",css:"purple"},
    {key:"black",css:"black"}
  ];

  const word=el("div","h-24 flex items-center justify-center text-4xl font-extrabold select-none","");
  const grid=el("div","grid grid-cols-3 gap-2");
  const info=el("div","text-sm text-gray-500","0/8");
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

  let index=0, startedAt=null, rec=[], finished=false, lock=false;

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
    localStorage.setItem("jsd:str", JSON.stringify({rounds,accuracy:acc,mean,score}));
    localStorage.setItem("jsd:done:t2","1");
    const next=document.getElementById("next");
    if(next){next.classList.remove("opacity-50","pointer-events-none");}
    setTimeout(()=>location.href="/t3", 500);
  }

  function choose(cssColor){
    if (finished || lock) return;
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

  CSS_COLORS.forEach((color)=>{
    const b=el("button","p-3 rounded-xl border bg-white hover:bg-gray-50 active:scale-95 dark:bg-slate-800 dark:border-slate-700");
    b.innerHTML='<span class="font-semibold" style="color:'+color.css+'">'+t(`colors.${color.key}`)+'</span>';
    b.addEventListener("click", ()=>choose(color.css));
    grid.append(b);
  });

  info.textContent="0/"+cfg.rounds;
  nextItem();
  load();
})();
