(function(){
  const t=(window.i18n)||((key)=>key);
  const el=(tag,cls,html)=>{const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e;};
  const box=document.getElementById("t2");
  const CSS_COLORS=["red","blue","green","gold","purple","black"];

  const word=el("div","h-24 flex items-center justify-center text-4xl font-extrabold select-none","");
  const grid=el("div","grid grid-cols-3 gap-2");
  const info=el("div","text-sm text-gray-500","0/8");
  box.append(word,grid,info);

  const rounds=8;
  let index=0, startedAt=null, rec=[], finished=false, lock=false;

  function nextItem(){
    const wIdx=Math.floor(Math.random()*CSS_COLORS.length);
    const cIdx=Math.floor(Math.random()*CSS_COLORS.length);
    const colorKey=CSS_COLORS[wIdx];
    word.textContent=t(`colors.${colorKey}`);
    word.style.color=CSS_COLORS[cIdx];
    word.dataset.trueColor=CSS_COLORS[cIdx];
    startedAt=performance.now();
  }

  function hardDisable(){
    finished=true; lock=true;
    grid.style.pointerEvents="none";
    grid.querySelectorAll("button").forEach(b=>b.disabled=true);
  }

  function endTest(){
    hardDisable();
    const acc=rec.filter(x=>x.ok).length/rounds;
    const mean=rec.reduce((a,b)=>a+(b.dt||0),0)/rounds;
    const score=Math.round(0.6*(acc*100)+0.4*Math.max(0,Math.min(100,(1-(mean-700)/(1400-700))*100)));
    localStorage.setItem("jsd:str", JSON.stringify({rounds,accuracy:acc,mean,score}));
    localStorage.setItem("jsd:done:t2","1");
    document.getElementById("next").classList.remove("opacity-50","pointer-events-none");
    setTimeout(()=>location.href="/t3", 500);
  }

  function choose(cssColor){
    if (finished || lock) return;
    if (index >= rounds){ endTest(); return; }
    lock = true;
    const dt=startedAt?performance.now()-startedAt:null;
    const ok=cssColor===word.dataset.trueColor;
    rec.push({ok,dt});
    index = Math.min(index+1, rounds);
    info.textContent = index+"/"+rounds;
    if (index >= rounds){ endTest(); return; }
    requestAnimationFrame(()=>{ nextItem(); lock=false; });
  }

  CSS_COLORS.forEach((cssColor)=>{
    const b=el("button","p-3 rounded-xl border bg-white hover:bg-gray-50 active:scale-95 dark:bg-slate-800 dark:border-slate-700");
    b.innerHTML='<span class="font-semibold" style="color:'+cssColor+'">'+t(`colors.${cssColor}`)+'</span>';
    b.addEventListener("click", ()=>choose(cssColor));
    grid.append(b);
  });

  nextItem();
})();
