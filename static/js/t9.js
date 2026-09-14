(function(){
  const flow=window.jsdFlow||null;
  if(flow && typeof flow.isActive==='function' && !flow.isActive('t9')) return;
  const root=document.getElementById('t9');
  if(!root) return;
  const t=window.i18n||((key,params)=>Object.keys(params||{}).reduce((s,k)=>s.replace(`{${k}}`,params[k]),key));
  const settings=(window.jsdConfig&&window.jsdConfig.settings)||{};
  const number=(key,fallback,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(settings[key]))?Number(settings[key]):fallback));
  const cfg={
    duration:number('ice_duration_ms',20000,5000,60000),
    interval:number('ice_spawn_interval_ms',720,180,3000),
    decay:number('ice_spawn_interval_decay_per_s',12,0,80),
    fallSpeed:number('ice_fall_speed_px_s',150,60,500),
    growth:number('ice_speed_growth_per_s',7,0,40),
    maxObjects:Math.round(number('ice_max_objects',12,4,30)),
    comboWindow:number('ice_combo_window_ms',1100,300,3000)
  };
  const style=document.createElement('style');
  style.textContent=`
    .t9-shell{display:grid;gap:1rem}
    .t9-hud{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.65rem}
    .t9-stat{border:1px solid rgba(148,163,184,.22);border-radius:1rem;padding:.7rem .8rem;background:rgba(248,250,252,.82);min-width:0}
    .dark .t9-stat{background:rgba(15,23,42,.65);border-color:rgba(71,85,105,.5)}
    .t9-stat-label{font-size:.67rem;font-weight:900;text-transform:uppercase;letter-spacing:.11em;color:#64748b}
    .t9-stat-value{font-size:1.35rem;font-weight:950;line-height:1.15;color:#0f172a;margin-top:.18rem}
    .dark .t9-stat-value{color:#f8fafc}
    .t9-stage{position:relative;isolation:isolate;overflow:hidden;min-height:30rem;border-radius:1.65rem;border:1px solid rgba(103,232,249,.55);background:radial-gradient(circle at 50% 10%,rgba(255,255,255,.98),rgba(224,242,254,.92) 42%,rgba(196,181,253,.85));box-shadow:inset 0 1px rgba(255,255,255,.8),0 18px 35px rgba(14,116,144,.12);touch-action:none}
    .dark .t9-stage{background:radial-gradient(circle at 50% 10%,rgba(30,41,59,.95),rgba(15,118,110,.32) 48%,rgba(49,46,129,.55));border-color:rgba(34,211,238,.38)}
    .t9-stage:before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.24),transparent 35%,rgba(255,255,255,.08) 70%,transparent);pointer-events:none;z-index:1}
    .t9-bubbles{position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:.5}
    .t9-bubble{position:absolute;width:.4rem;height:.4rem;border:1px solid rgba(255,255,255,.85);border-radius:50%;animation:t9-rise 5s linear infinite}
    @keyframes t9-rise{from{transform:translateY(3rem);opacity:0}15%{opacity:.8}to{transform:translateY(-32rem);opacity:0}}
    .t9-glass{position:absolute;z-index:2;left:50%;bottom:-9.5rem;transform:translateX(-50%);width:min(84%,29rem);height:20rem;border:2px solid rgba(255,255,255,.66);border-top:0;border-radius:0 0 4rem 4rem;background:linear-gradient(110deg,rgba(255,255,255,.17),rgba(255,255,255,.04) 30%,rgba(125,211,252,.18) 72%,rgba(255,255,255,.26));box-shadow:inset 12px 0 18px rgba(255,255,255,.16),inset -12px 0 20px rgba(14,116,144,.1)}
    .t9-liquid{position:absolute;z-index:-1;left:3%;right:3%;bottom:1%;height:58%;border-radius:0 0 3.4rem 3.4rem;background:linear-gradient(180deg,rgba(45,212,191,.33),rgba(6,182,212,.65) 55%,rgba(30,64,175,.63));clip-path:polygon(0 8%,20% 4%,40% 9%,60% 3%,80% 8%,100% 2%,100% 100%,0 100%)}
    .t9-rim{position:absolute;z-index:4;left:50%;bottom:9.5rem;transform:translateX(-50%);width:min(87%,30rem);height:2.25rem;border:3px solid rgba(255,255,255,.82);border-radius:50%;background:rgba(34,211,238,.12);box-shadow:0 0 0 5px rgba(255,255,255,.1),0 8px 18px rgba(8,47,73,.12)}
    .t9-object{position:absolute;z-index:5;width:3.15rem;height:3.15rem;margin:-1.575rem 0 0 -1.575rem;border:0;padding:0;display:grid;place-items:center;background:transparent;cursor:pointer;filter:drop-shadow(0 8px 8px rgba(15,23,42,.16));transition:transform .12s ease,opacity .15s ease}
    .t9-object:hover{transform:scale(1.1)}
    .t9-object:active{transform:scale(.9)}
    .t9-object.ice:before{content:"";width:2.5rem;height:2.5rem;border-radius:.7rem;background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(125,211,252,.8));border:2px solid rgba(255,255,255,.92);box-shadow:inset -8px -8px 0 rgba(14,165,233,.16),0 7px 10px rgba(8,145,178,.2);transform:rotate(9deg)}
    .t9-object.decoy{font-size:2.35rem;line-height:1}
    .t9-object.is-caught{opacity:0;transform:scale(1.6) rotate(18deg)}
    .t9-object.is-wrong{animation:t9-wrong .28s ease}
    @keyframes t9-wrong{25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
    .t9-overlay{position:absolute;z-index:8;inset:0;display:grid;place-items:center;padding:1.25rem;background:linear-gradient(180deg,rgba(15,23,42,.02),rgba(15,23,42,.2));transition:opacity .2s ease}
    .t9-overlay.is-hidden{opacity:0;pointer-events:none}
    .t9-panel{max-width:23rem;border:1px solid rgba(255,255,255,.6);border-radius:1.5rem;padding:1.35rem;text-align:center;background:rgba(255,255,255,.78);box-shadow:0 20px 50px rgba(15,23,42,.15);backdrop-filter:blur(12px)}
    .dark .t9-panel{background:rgba(15,23,42,.78);border-color:rgba(148,163,184,.35)}
    .t9-button{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:.9rem;padding:.8rem 1.15rem;font-weight:900;color:white;background:linear-gradient(135deg,#0891b2,#7c3aed);box-shadow:0 9px 20px rgba(8,145,178,.25);cursor:pointer;transition:transform .15s ease,filter .15s ease}
    .t9-button:hover{filter:brightness(1.08);transform:translateY(-1px)}
    .t9-button:active{transform:translateY(1px)}
    .t9-status{min-height:1.5rem;font-weight:800;color:#155e75}.dark .t9-status{color:#a5f3fc}
    .t9-hint{font-size:.8rem;color:#64748b}.dark .t9-hint{color:#94a3b8}
    @media(max-width:520px){.t9-hud{grid-template-columns:repeat(2,minmax(0,1fr))}.t9-stage{min-height:27rem}.t9-glass{width:92%}.t9-rim{width:94%}}
  `;
  document.head.appendChild(style);
  root.innerHTML=`<section class="t9-shell" aria-label="${t('t9.canvas_label')}">
    <div class="t9-hud">
      <div class="t9-stat"><div class="t9-stat-label">${t('t8.stat_score')}</div><div class="t9-stat-value" data-score>0</div></div>
      <div class="t9-stat"><div class="t9-stat-label">${t('t9.time')}</div><div class="t9-stat-value" data-time>—</div></div>
      <div class="t9-stat"><div class="t9-stat-label">${t('t9.ice')}</div><div class="t9-stat-value" data-hits>0</div></div>
      <div class="t9-stat"><div class="t9-stat-label">${t('t9.combo_label')}</div><div class="t9-stat-value" data-combo>x0</div></div>
    </div>
    <div class="t9-stage" data-stage role="application" aria-label="${t('t9.canvas_label')}">
      <div class="t9-bubbles" data-bubbles aria-hidden="true"></div><div class="t9-glass"><div class="t9-liquid"></div></div><div class="t9-rim"></div>
      <div class="t9-overlay" data-overlay><div class="t9-panel"><div class="mb-2 text-4xl">🧊</div><h3 class="text-xl font-black text-slate-900 dark:text-white" data-title>${t('t9.ready')}</h3><p class="mt-2 text-sm text-slate-600 dark:text-slate-300" data-copy>${t('t9.start_hint')}</p><button type="button" class="t9-button mt-5" data-start>${t('t9.start')}</button></div></div>
    </div>
    <p class="t9-status" data-status aria-live="polite">${t('t9.ready')}</p><p class="t9-hint">${t('t9.start_hint')}</p>
  </section>`;
  const stage=root.querySelector('[data-stage]'), overlay=root.querySelector('[data-overlay]'), start=root.querySelector('[data-start]'), status=root.querySelector('[data-status]');
  const scoreEl=root.querySelector('[data-score]'), timeEl=root.querySelector('[data-time]'), hitsEl=root.querySelector('[data-hits]'), comboEl=root.querySelector('[data-combo]');
  const state={running:false,startedAt:0,lastFrame:0,lastSpawn:0,raf:0,score:0,hits:0,mistakes:0,missed:0,wrongTaps:0,spawnedGood:0,combo:0,bestCombo:0,lastHit:0,objects:[],finished:false};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const updateHud=(remaining)=>{scoreEl.textContent=String(Math.round(state.score));timeEl.textContent=state.running?`${Math.ceil(Math.max(0,remaining)/1000)}s`:'—';hitsEl.textContent=String(state.hits);comboEl.textContent=`x${state.combo}`;};
  const message=(key,params)=>{status.textContent=t(key,params||{});};
  const clearObjects=()=>{state.objects.forEach(o=>o.el.remove());state.objects=[];};
  const spawn=()=>{
    if(state.objects.length>=cfg.maxObjects) return;
    const el=document.createElement('button'); const good=Math.random()<.62; const decoys=['🍋','🫒','🍒','🍓'];
    el.type='button';el.className=`t9-object ${good?'ice':'decoy'}`;el.setAttribute('aria-label',t(good?'t9.ice':'t9.decoy'));if(!good) el.textContent=decoys[Math.floor(Math.random()*decoys.length)];
    const x=10+Math.random()*80; el.style.left=`${x}%`;el.style.top='-2.5rem';stage.appendChild(el);
    const object={el,good,x:x/100,y:-48,size:50,speed:cfg.fallSpeed*(.82+Math.random()*.34),removed:false};
    if(good) state.spawnedGood+=1;
    el.addEventListener('pointerdown',(event)=>{event.preventDefault();hit(object);});state.objects.push(object);
  };
  const hit=(object)=>{
    if(!state.running||object.removed) return;
    object.removed=true;
    if(object.good){
      state.hits+=1; state.combo=(performance.now()-state.lastHit<=cfg.comboWindow)?state.combo+1:1; state.bestCombo=Math.max(state.bestCombo,state.combo);state.lastHit=performance.now();state.score=clamp(state.score+8+Math.min(12,state.combo*2),0,100);object.el.classList.add('is-caught');message('t9.hit');
    }else{state.mistakes+=1;state.wrongTaps+=1;state.combo=0;state.score=clamp(state.score-8,0,100);object.el.classList.add('is-wrong');message('t9.miss');setTimeout(()=>object.el.remove(),280);}
    updateHud(cfg.duration-(performance.now()-state.startedAt));setTimeout(()=>{object.el.remove();state.objects=state.objects.filter(item=>item!==object);},150);
  };
  const finish=()=>{state.running=false;state.finished=true;cancelAnimationFrame(state.raf);state.objects.forEach(o=>{if(!o.removed&&o.good){state.missed+=1;state.mistakes+=1;}});const elapsed=Math.min(cfg.duration,performance.now()-state.startedAt);const accuracy=state.spawnedGood?state.hits/state.spawnedGood:0;const perfect=state.spawnedGood>0&&state.hits===state.spawnedGood&&state.missed===0&&state.wrongTaps===0;const escalatingPenalty=state.mistakes*4+Math.max(0,state.mistakes-1)*state.mistakes*1.5;const finalScore=perfect?100:clamp(Math.round(100*accuracy-escalatingPenalty),0,99);state.score=finalScore;clearObjects();updateHud(0);localStorage.setItem('jsd:ice',JSON.stringify({score:finalScore,hits:state.hits,mistakes:state.mistakes,missed:state.missed,best_combo:state.bestCombo,elapsed_ms:Math.round(elapsed),duration_ms:cfg.duration,accuracy}));localStorage.setItem('jsd:done:t9','1');overlay.classList.remove('is-hidden');overlay.querySelector('[data-title]').textContent=t('t9.finished',{score:finalScore});overlay.querySelector('[data-copy]').textContent=`${state.hits}/${state.spawnedGood} ${t('t9.ice').toLowerCase()} · ${state.mistakes} ${t('t9.errors').toLowerCase()} · ${t('t9.combo',{value:state.bestCombo})}`;start.hidden=true;message('t9.finished',{score:finalScore});const next=document.getElementById('next');if(next){next.classList.remove('pointer-events-none','opacity-50');}}
  const frame=(now)=>{if(!state.running)return;const elapsed=now-state.startedAt,remaining=cfg.duration-elapsed,dt=Math.min(40,(now-state.lastFrame)||16)/1000;state.lastFrame=now;if(remaining<=0){finish();return;}const seconds=elapsed/1000;const interval=Math.max(180,cfg.interval-seconds*cfg.decay);if(now-state.lastSpawn>=interval){spawn();state.lastSpawn=now;}state.objects.forEach(o=>{if(o.removed)return;o.y+=(o.speed+seconds*cfg.growth)*dt;o.el.style.top=`${o.y}px`;if(o.y>stage.clientHeight+60){o.removed=true;if(o.good){state.missed+=1;state.mistakes+=1;state.combo=0;}o.el.remove();}});state.objects=state.objects.filter(o=>!o.removed);updateHud(remaining);state.raf=requestAnimationFrame(frame);};
  const begin=()=>{clearObjects();state.running=true;state.finished=false;state.startedAt=performance.now();state.lastFrame=state.startedAt;state.lastSpawn=state.startedAt-cfg.interval;state.score=0;state.hits=0;state.mistakes=0;state.missed=0;state.wrongTaps=0;state.spawnedGood=0;state.combo=0;state.bestCombo=0;state.lastHit=0;overlay.classList.add('is-hidden');message('t9.running');updateHud(cfg.duration);state.raf=requestAnimationFrame(frame);};
  for(let i=0;i<10;i+=1){const bubble=document.createElement('i');bubble.className='t9-bubble';bubble.style.left=`${8+Math.random()*84}%`;bubble.style.bottom=`${-5+Math.random()*35}%`;bubble.style.animationDelay=`${Math.random()*5}s`;root.querySelector('[data-bubbles]').appendChild(bubble);}
  start.addEventListener('click',begin);updateHud(0);
})();
