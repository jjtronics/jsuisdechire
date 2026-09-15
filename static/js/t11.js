(function(){
  const root = document.getElementById('t11');
  if (!root) return;
  const t = window.i18n || ((key) => key);
  const settings = (window.jsdConfig && window.jsdConfig.settings) || {};
  const numberSetting = (key, fallback, min, max) => {
    const value = Number(settings[key]);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  };
  const cfg = {
    duration: numberSetting('dino_duration_ms', 30000, 10000, 90000),
    initialSpeed: numberSetting('dino_initial_speed_px_s', 310, 120, 600),
    growth: numberSetting('dino_speed_growth_per_s', 7, 0, 40),
    spawnInterval: numberSetting('dino_spawn_interval_ms', 1450, 500, 4000),
    spawnDecay: numberSetting('dino_spawn_decay_per_s', 18, 0, 100),
    jumpDuration: numberSetting('dino_jump_impulse_ms', 720, 300, 1400),
    jumpThreshold: numberSetting('dino_jump_threshold', 1.35, 0.5, 4),
  };
  const style = document.createElement('style');
  style.textContent = `
    #t11 .t11-game{display:grid;gap:1rem}
    #t11 .t11-hud{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem}
    #t11 .t11-stat{min-height:4.25rem;padding:.7rem .35rem;border:1px solid rgba(124,58,237,.18);border-radius:1.05rem;background:linear-gradient(145deg,#fff,#f5f3ff);text-align:center;box-shadow:0 14px 30px -24px rgba(76,29,149,.6)}
    #t11 .t11-stat-label{display:block;color:#64748b;font-size:.6rem;font-weight:950;letter-spacing:.1em;text-transform:uppercase}
    #t11 .t11-stat-value{display:block;margin-top:.18rem;color:#4c1d95;font-size:1.18rem;font-weight:950;line-height:1}
    #t11 .t11-stage{position:relative;isolation:isolate;min-height:25rem;overflow:hidden;border:4px solid #312e81;border-radius:1.75rem;background:linear-gradient(180deg,#7c3aed 0%,#2563eb 50%,#0f172a 50.2%,#111827 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.22),0 22px 36px -25px rgba(49,46,129,.9);touch-action:none}
    #t11 .t11-stage::before{content:'';position:absolute;inset:0;z-index:0;background:radial-gradient(circle at 16% 20%,rgba(255,255,255,.8) 0 .18rem,transparent .22rem),radial-gradient(circle at 78% 15%,rgba(255,255,255,.55) 0 .13rem,transparent .18rem),linear-gradient(180deg,transparent 55%,rgba(2,6,23,.28));background-size:8rem 6rem,6rem 5rem,auto;pointer-events:none}
    #t11 .t11-city{position:absolute;z-index:1;left:0;right:0;bottom:4.8rem;height:6rem;background:linear-gradient(135deg,transparent 0 5%,rgba(30,41,59,.55) 5% 18%,transparent 18% 22%,rgba(30,41,59,.5) 22% 31%,transparent 31% 35%,rgba(30,41,59,.45) 35% 51%,transparent 51% 56%,rgba(30,41,59,.52) 56% 68%,transparent 68% 74%,rgba(30,41,59,.45) 74% 89%,transparent 89%);opacity:.7}
    #t11 .t11-track{position:absolute;z-index:2;left:0;right:0;bottom:0;height:5rem;border-top:3px solid #fbbf24;background:repeating-linear-gradient(110deg,#1e293b 0 3rem,#334155 3rem 4.5rem);box-shadow:0 -10px 28px rgba(2,6,23,.3)}
    #t11 .t11-track::after{content:'';position:absolute;left:0;right:0;top:.8rem;border-top:3px dashed rgba(255,255,255,.7)}
    #t11 .t11-dino{position:absolute;z-index:5;left:12%;bottom:4.6rem;width:4.7rem;height:4.7rem;display:grid;place-items:center;font-size:4rem;line-height:1;filter:drop-shadow(0 .55rem .35rem rgba(2,6,23,.4));transform-origin:50% 100%;will-change:transform}
    #t11 .t11-dino.is-hit{animation:t11-hit .35s ease}
    @keyframes t11-hit{30%{filter:grayscale(1) drop-shadow(-.45rem .55rem .35rem rgba(2,6,23,.4))}70%{filter:grayscale(1) drop-shadow(.4rem .55rem .35rem rgba(2,6,23,.4))}}
    #t11 .t11-obstacle{position:absolute;z-index:4;bottom:4.7rem;width:var(--obstacle-width,2.1rem);height:var(--obstacle-height,3.4rem);transform:scaleX(var(--obstacle-scale,1));transform-origin:bottom center}
    #t11 .t11-obstacle[data-variant="normal"],#t11 .t11-obstacle[data-variant="wide"]{display:block;background:transparent;}
    #t11 .t11-cactus-core{position:absolute;left:50%;bottom:0;width:1.35rem;height:3.35rem;transform:translateX(-50%);border:3px solid #14532d;border-radius:.8rem .8rem .36rem .36rem;background:linear-gradient(90deg,#22c55e,#86efac 48%,#15803d);box-shadow:inset .24rem 0 rgba(255,255,255,.3),0 .45rem .4rem rgba(2,6,23,.34);}
    #t11 .t11-cactus-core::after{content:'···';position:absolute;top:.55rem;left:.23rem;color:rgba(20,83,45,.7);font-size:.8rem;font-weight:950;line-height:1.1;letter-spacing:.08em;writing-mode:vertical-rl;}
    #t11 .t11-cactus-arm{position:absolute;bottom:.82rem;width:.95rem;height:1.55rem;border:3px solid #14532d;border-bottom:0;border-radius:.7rem .7rem 0 0;background:linear-gradient(90deg,#22c55e,#86efac 60%,#15803d);box-shadow:inset .18rem 0 rgba(255,255,255,.24);}
    #t11 .t11-cactus-arm-left{left:.12rem;border-right:0;transform:rotate(-8deg)}
    #t11 .t11-cactus-arm-right{right:.12rem;border-left:0;transform:rotate(8deg)}
    #t11 .t11-obstacle[data-variant="wide"] .t11-cactus-core{height:2.9rem;width:1.45rem;}
    #t11 .t11-obstacle[data-variant="wide"] .t11-cactus-arm{bottom:.62rem;}
    #t11 .t11-obstacle[data-variant="small"]{--obstacle-height:2.55rem;--obstacle-width:1.75rem;--obstacle-scale:.94;display:grid;place-items:end center;border:0;background:transparent;box-shadow:none;font-size:2.85rem;line-height:1;filter:drop-shadow(0 .45rem .3rem rgba(2,6,23,.4));}
    #t11 .t11-obstacle[data-variant="tall"]{--obstacle-height:4.25rem;--obstacle-width:3.3rem;--obstacle-scale:1.02;display:block;border:0;background:transparent;box-shadow:none;filter:drop-shadow(0 .45rem .3rem rgba(2,6,23,.4));transform:rotate(-7deg) scale(var(--obstacle-scale,1));}
    #t11 .t11-drunk-head{position:absolute;top:.08rem;left:.88rem;width:1.48rem;height:1.48rem;border:3px solid #451a03;border-radius:50%;background:#f6c58b;transform:rotate(-13deg);}
    #t11 .t11-drunk-head::before{content:'•  •';position:absolute;top:.32rem;left:.17rem;color:#451a03;font-size:.48rem;font-weight:950;letter-spacing:.06rem;white-space:pre;}
    #t11 .t11-drunk-head::after{content:'~';position:absolute;left:.48rem;bottom:.06rem;color:#9f1239;font-size:.86rem;font-weight:950;line-height:1;}
    #t11 .t11-drunk-body{position:absolute;top:1.42rem;left:.92rem;width:1.38rem;height:1.45rem;border:3px solid #1e3a8a;border-radius:.55rem .55rem .25rem .25rem;background:linear-gradient(90deg,#60a5fa,#2563eb 65%,#1d4ed8);transform:rotate(8deg);}
    #t11 .t11-drunk-arm{position:absolute;top:1.68rem;width:1.2rem;height:.28rem;border:3px solid #451a03;border-radius:999px;background:#f6c58b;}
    #t11 .t11-drunk-arm-left{left:.12rem;transform:rotate(-31deg)}
    #t11 .t11-drunk-arm-right{right:.03rem;transform:rotate(38deg)}
    #t11 .t11-drunk-leg{position:absolute;top:2.7rem;width:.3rem;height:1.25rem;border:3px solid #172554;border-radius:999px;background:#2563eb;}
    #t11 .t11-drunk-leg-left{left:1rem;transform:rotate(14deg)}
    #t11 .t11-drunk-leg-right{left:1.62rem;transform:rotate(-24deg)}
    #t11 .t11-obstacle.is-hit{filter:grayscale(1);opacity:.4}
    #t11 .t11-overlay{position:absolute;z-index:8;inset:0;display:grid;place-items:center;padding:1rem;background:linear-gradient(180deg,rgba(15,23,42,.12),rgba(15,23,42,.55));transition:opacity .2s ease}
    #t11 .t11-overlay.is-hidden{opacity:0;pointer-events:none}
    #t11 .t11-panel{width:min(92%,25rem);padding:1.35rem;border:1px solid rgba(255,255,255,.65);border-radius:1.5rem;background:rgba(255,255,255,.9);text-align:center;box-shadow:0 24px 50px rgba(15,23,42,.28);backdrop-filter:blur(12px)}
    #t11 .t11-panel h3{color:#1e1b4b;font-size:1.25rem;font-weight:950}
    #t11 .t11-panel p{margin-top:.45rem;color:#475569;font-size:.8rem;font-weight:700;line-height:1.45}
    #t11 .t11-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem;margin-top:1rem}
    #t11 .t11-button{min-height:3rem;padding:.75rem 1rem;border:0;border-radius:999px;color:#fff;font-weight:950;box-shadow:0 12px 24px -16px rgba(76,29,149,.9);cursor:pointer;transition:transform .14s ease,filter .14s ease}
    #t11 .t11-button:hover{transform:translateY(-2px);filter:brightness(1.08)}#t11 .t11-button:active{transform:translateY(1px)}
    #t11 .t11-button.sensor{background:linear-gradient(135deg,#7c3aed,#2563eb)}#t11 .t11-button.touch{background:linear-gradient(135deg,#db2777,#f97316)}
    #t11 .t11-status{min-height:1.5rem;color:#4c1d95;font-size:.85rem;font-weight:900;text-align:center}.dark #t11 .t11-status{color:#ddd6fe}
    #t11 .t11-hint{color:#64748b;font-size:.78rem;font-weight:700;text-align:center}.dark #t11 .t11-hint{color:#94a3b8}
    #t11 .t11-jump-button{display:block;width:100%;min-height:3.4rem;border:0;border-radius:1.1rem;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-size:1rem;font-weight:950;box-shadow:0 14px 25px -18px rgba(126,34,206,.9);touch-action:manipulation}
    html.dark #t11 .t11-stat{border-color:rgba(196,181,253,.2);background:rgba(30,27,75,.65)}html.dark #t11 .t11-stat-label{color:#a5b4fc}html.dark #t11 .t11-stat-value{color:#ede9fe}html.dark #t11 .t11-panel{background:rgba(15,23,42,.9);border-color:rgba(148,163,184,.35)}html.dark #t11 .t11-panel h3{color:#f8fafc}html.dark #t11 .t11-panel p{color:#cbd5e1}
    @media(max-width:520px){#t11 .t11-hud{grid-template-columns:repeat(2,minmax(0,1fr))}#t11 .t11-stage{min-height:23rem;border-width:3px}#t11 .t11-dino{left:10%;font-size:3.5rem}#t11 .t11-stat-value{font-size:1rem}}
  `;
  document.head.appendChild(style);
  root.innerHTML = `<section class="t11-game" aria-label="${t('t11.canvas_label')}">
    <div class="t11-hud">
      <div class="t11-stat"><span class="t11-stat-label">${t('t8.stat_score')}</span><span class="t11-stat-value" data-score>0</span></div>
      <div class="t11-stat"><span class="t11-stat-label">${t('t11.time')}</span><span class="t11-stat-value" data-time>—</span></div>
      <div class="t11-stat"><span class="t11-stat-label">${t('t11.distance')}</span><span class="t11-stat-value" data-distance>0 m</span></div>
      <div class="t11-stat"><span class="t11-stat-label">${t('t11.obstacles')}</span><span class="t11-stat-value" data-obstacles>0</span></div>
    </div>
    <div class="t11-stage" data-stage role="application" aria-label="${t('t11.canvas_label')}">
      <div class="t11-city" aria-hidden="true"></div><div class="t11-track" aria-hidden="true"></div>
      <div class="t11-dino" data-dino aria-hidden="true">🦖</div>
      <div class="t11-overlay" data-overlay><div class="t11-panel"><div class="mb-1 text-4xl">🦖</div><h3 data-title>${t('t11.ready')}</h3><p data-copy>${t('t11.sensor_hint')}</p><div class="t11-actions"><button type="button" class="t11-button sensor" data-sensor>${t('t11.calibrate')}</button><button type="button" class="t11-button touch" data-touch>${t('t11.touch_mode')}</button></div></div></div>
    </div>
    <p class="t11-status" data-status aria-live="polite">${t('t11.ready')}</p>
    <p class="t11-hint" data-hint>${t('t11.sensor_hint')}</p>
    <button type="button" class="t11-jump-button" data-jump>${t('t11.jump')}</button>
  </section>`;
  const stage = root.querySelector('[data-stage]');
  const overlay = root.querySelector('[data-overlay]');
  const title = root.querySelector('[data-title]');
  const copy = root.querySelector('[data-copy]');
  const sensorButton = root.querySelector('[data-sensor]');
  const touchButton = root.querySelector('[data-touch]');
  const jumpButton = root.querySelector('[data-jump]');
  const status = root.querySelector('[data-status]');
  const hint = root.querySelector('[data-hint]');
  const dino = root.querySelector('[data-dino]');
  const scoreEl = root.querySelector('[data-score]');
  const timeEl = root.querySelector('[data-time]');
  const distanceEl = root.querySelector('[data-distance]');
  const obstaclesEl = root.querySelector('[data-obstacles]');
  const state = {running:false,finished:false,sensorUsed:false,sensorSamples:0,baseline:0,lastMotion:0,startedAt:0,lastFrame:0,nextSpawnAt:0,raf:0,jumpY:0,jumpVelocity:0,jumpGravity:0,inputHeld:false,holdStartedAt:0,bigJumpAnnounced:false,score:0,jumps:0,obstacles:0,resolved:0,avoided:0,misses:0,distance:0,items:[],segments:[],lastPattern:''};
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const updateHud = (remaining) => {
    scoreEl.textContent = String(Math.round(state.score));
    timeEl.textContent = state.running ? `${Math.ceil(Math.max(0, remaining) / 1000)}s` : '—';
    distanceEl.textContent = `${state.distance.toFixed(1)} m`;
    obstaclesEl.textContent = String(state.obstacles);
  };
  const setStatus = (key, params) => { status.textContent = t(key, params || {}); };
  const clearItems = () => { state.items.forEach(item => item.el.remove()); state.items = []; };
  const isJumping = () => state.jumpY > 0 || state.jumpVelocity > 0;
  const scoreForCurrentRun = () => {
    const expectedDistance = Math.max(1, (cfg.duration / 1000) * (cfg.initialSpeed / 100));
    const distanceRatio = clamp(state.distance / expectedDistance, 0, 1);
    const cleanRatio = state.resolved ? state.avoided / state.resolved : 0;
    const activeSegments = state.segments.filter(segment => segment.resolved > 0);
    const consistencyRatio = activeSegments.length ? Math.min(...activeSegments.map(segment => segment.avoided / segment.resolved)) : 0;
    return clamp(Math.round(distanceRatio * 15 + Math.pow(cleanRatio, 1.25) * 65 + consistencyRatio * 20), 0, 100);
  };
  const segmentForElapsed = (elapsed) => clamp(Math.floor((elapsed / cfg.duration) * 3), 0, 2);
  const resolveObstacle = (item, avoided) => {
    if (item.resolved) return;
    item.resolved = true;
    state.resolved += 1;
    const segmentIndex = segmentForElapsed(performance.now() - state.startedAt);
    const segment = state.segments[segmentIndex] || state.segments[0];
    segment.resolved += 1;
    if (avoided) {
      state.avoided += 1;
      segment.avoided += 1;
    } else {
      state.misses += 1;
    }
  };
  const renderDino = () => {
    const tilt = clamp(-state.jumpVelocity * 0.018, -14, 12);
    const squash = state.jumpY <= 0 && state.jumps > 0 ? 0.96 : 1;
    dino.style.transform = `translate3d(0, ${-state.jumpY.toFixed(2)}px, 0) scaleX(-1) rotate(${tilt}deg) scale(${squash})`;
  };
  const jump = (requestedHeight = 112) => {
    if (!state.running || isJumping()) return;
    const flightTime = cfg.jumpDuration / 1000;
    const baseHeight = 112;
    const jumpHeight = clamp(Number(requestedHeight) || baseHeight, 58, 148);
    const gravity = (8 * baseHeight) / (flightTime * flightTime);
    state.jumpY = 0.5;
    state.jumpVelocity = Math.sqrt(2 * gravity * jumpHeight);
    state.jumpGravity = gravity;
    state.jumps += 1;
    dino.classList.add('is-jumping');
    renderDino();
    setStatus(jumpHeight >= 112 ? 't11.big_jump' : 't11.small_jump');
  };
  const beginManualJump = () => {
    if (state.inputHeld || !state.running || isJumping()) return;
    state.inputHeld = true;
    state.holdStartedAt = performance.now();
    state.bigJumpAnnounced = false;
    jump(64);
  };
  const releaseManualJump = () => {
    state.inputHeld = false;
  };
  const scheduleSpawn = (now, seconds) => {
    const interval = Math.max(520, cfg.spawnInterval - seconds * cfg.spawnDecay);
    const surprise = 0.68 + Math.random() * 0.7;
    state.nextSpawnAt = now + interval * surprise;
  };
  const spawn = (now, seconds) => {
    const patterns = ['small', 'normal', 'tall', 'wide', 'double'];
    let pattern = patterns[Math.floor(Math.random() * patterns.length)];
    if (pattern === state.lastPattern) pattern = patterns[(patterns.indexOf(pattern) + 1 + Math.floor(Math.random() * (patterns.length - 1))) % patterns.length];
    state.lastPattern = pattern;
    const makeObstacle = (variant, offset = 0, speedFactor = 1) => {
    const element = document.createElement('span');
    element.className = 't11-obstacle';
    element.dataset.variant = variant;
    element.setAttribute('aria-hidden', 'true');
    if (variant === 'small') {
      element.textContent = '🍺';
    } else if (variant === 'tall') {
      element.innerHTML = '<span class="t11-drunk-head"></span><span class="t11-drunk-body"></span><span class="t11-drunk-arm t11-drunk-arm-left"></span><span class="t11-drunk-arm t11-drunk-arm-right"></span><span class="t11-drunk-leg t11-drunk-leg-left"></span><span class="t11-drunk-leg t11-drunk-leg-right"></span>';
    } else {
      element.innerHTML = '<span class="t11-cactus-arm t11-cactus-arm-left"></span><span class="t11-cactus-arm t11-cactus-arm-right"></span><span class="t11-cactus-core"></span>';
    }
    const x = stage.clientWidth + 35 + offset;
    element.style.left = `${x}px`;
    stage.appendChild(element);
    state.obstacles += 1;
    state.items.push({el:element,x,hit:false,resolved:false,speedFactor,width:0,height:0});
    const item = state.items[state.items.length - 1];
    item.width = element.offsetWidth || (variant === 'wide' ? 58 : 34);
    item.height = element.offsetHeight || ({small:41,tall:68,wide:49}[variant] || 54);
    };
    makeObstacle(pattern === 'double' ? 'normal' : pattern);
    if (pattern === 'double' && stage.clientWidth > 360) {
      makeObstacle(Math.random() > .5 ? 'small' : 'normal', 105 + Math.random() * 44, .96 + Math.random() * .08);
    }
    scheduleSpawn(now, seconds);
  };
  const hitObstacle = (item) => {
    item.hit = true;
    resolveObstacle(item, false);
    state.score = scoreForCurrentRun();
    item.el.classList.add('is-hit');
    dino.classList.add('is-hit');
    setStatus('t11.hit');
    window.setTimeout(() => dino.classList.remove('is-hit'), 350);
  };
  const finish = () => {
    state.running = false;
    state.finished = true;
    cancelAnimationFrame(state.raf);
    const elapsed = Math.min(cfg.duration, performance.now() - state.startedAt);
    const distance = elapsed / 1000 * (cfg.initialSpeed / 100);
    state.distance = Math.max(state.distance, distance);
    const finalScore = scoreForCurrentRun();
    state.score = finalScore;
    clearItems();
    updateHud(0);
    window.removeEventListener('devicemotion', onMotion);
    dino.classList.remove('is-jumping');
    state.jumpY = 0;
    state.jumpVelocity = 0;
    state.inputHeld = false;
    state.jumpGravity = 0;
    renderDino();
    localStorage.setItem('jsd:dino', JSON.stringify({
      score: finalScore, jumps: state.jumps, obstacles: state.resolved, misses: state.misses,
      distance_m: Number(state.distance.toFixed(2)), elapsed_ms: Math.round(elapsed), sensor_used: state.sensorUsed ? 1 : 0,
    }));
    localStorage.setItem('jsd:done:t11', '1');
    title.textContent = t('t11.finished', {score: finalScore});
    copy.textContent = `${state.avoided}/${state.resolved} ${t('t11.avoided')} · ${state.jumps} ${t('t11.jumps').toLowerCase()}`;
    overlay.classList.remove('is-hidden');
    sensorButton.hidden = true; touchButton.hidden = true;
    setStatus('t11.finished', {score: finalScore});
    const next = document.getElementById('next');
    if (next) next.classList.remove('pointer-events-none', 'opacity-50');
  };
  const frame = (now) => {
    if (!state.running) return;
    const elapsed = now - state.startedAt;
    const remaining = cfg.duration - elapsed;
    const dt = Math.min(45, (now - state.lastFrame) || 16) / 1000;
    state.lastFrame = now;
    if (remaining <= 0) { finish(); return; }
    const seconds = elapsed / 1000;
    const speed = cfg.initialSpeed + seconds * cfg.growth;
    if (now >= state.nextSpawnAt) spawn(now, seconds);
    if (isJumping()) {
      const heldFor = now - state.holdStartedAt;
      if (state.inputHeld && state.jumpVelocity > 0 && heldFor < 190) {
        const maxVelocity = Math.sqrt(2 * state.jumpGravity * 148);
        state.jumpVelocity = Math.min(maxVelocity, state.jumpVelocity + 1350 * dt);
        if (!state.bigJumpAnnounced && heldFor >= 120) {
          state.bigJumpAnnounced = true;
          setStatus('t11.big_jump');
        }
      }
      state.jumpY += state.jumpVelocity * dt;
      state.jumpVelocity -= state.jumpGravity * dt;
      if (state.jumpY <= 0 && state.jumpVelocity < 0) {
        state.jumpY = 0;
        state.jumpVelocity = 0;
        dino.classList.remove('is-jumping');
      }
      renderDino();
    }
    state.distance += speed * dt / 100;
    const dinoLeft = stage.clientWidth * 0.12;
    state.items.forEach(item => {
      item.x -= speed * item.speedFactor * dt;
      item.el.style.left = `${item.x}px`;
      const obstacleRight = item.x + item.width;
      const dinoRight = dinoLeft + 68;
      const clearsObstacle = state.jumpY > Math.max(24, item.height - 11);
      if (!item.hit && obstacleRight > dinoLeft + 12 && item.x < dinoRight && !clearsObstacle) hitObstacle(item);
      if (!item.resolved && obstacleRight < dinoLeft + 4) resolveObstacle(item, true);
      if (item.x < -70) item.el.remove();
    });
    state.items = state.items.filter(item => item.x >= -70);
    state.score = scoreForCurrentRun();
    updateHud(remaining);
    state.raf = requestAnimationFrame(frame);
  };
  const onMotion = (event) => {
    if (!state.running || !state.sensorUsed) return;
    const a = event.accelerationIncludingGravity || event.acceleration;
    if (!a) return;
    const magnitude = Math.sqrt((Number(a.x) || 0) ** 2 + (Number(a.y) || 0) ** 2 + (Number(a.z) || 0) ** 2);
    if (!Number.isFinite(magnitude) || magnitude > 40) return;
    state.sensorSamples += 1;
    if (!state.baseline) state.baseline = magnitude;
    state.baseline = state.baseline * 0.94 + magnitude * 0.06;
    const spike = Math.abs(magnitude - state.baseline);
    if (spike >= cfg.jumpThreshold && performance.now() - state.lastMotion > 520) {
      state.lastMotion = performance.now();
      const intensity = clamp((spike - cfg.jumpThreshold) / Math.max(0.5, cfg.jumpThreshold * 2.5), 0, 1);
      jump(64 + intensity * 84);
    }
  };
  const begin = (sensorUsed) => {
    clearItems();
    const now = performance.now();
    Object.assign(state,{running:true,finished:false,sensorUsed:!!sensorUsed,sensorSamples:0,baseline:0,lastMotion:0,startedAt:now,lastFrame:now,nextSpawnAt:now + Math.max(420, cfg.spawnInterval * .72),score:0,jumps:0,obstacles:0,resolved:0,avoided:0,misses:0,distance:0,jumpY:0,jumpVelocity:0,jumpGravity:0,inputHeld:false,holdStartedAt:0,bigJumpAnnounced:false,items:[],segments:[{resolved:0,avoided:0},{resolved:0,avoided:0},{resolved:0,avoided:0}],lastPattern:''});
    dino.classList.remove('is-jumping');
    renderDino();
    overlay.classList.add('is-hidden');
    hint.textContent = t(sensorUsed ? 't11.sensor_active' : 't11.touch_hint');
    setStatus(sensorUsed ? 't11.sensor_active' : 't11.touch_hint');
    updateHud(cfg.duration);
    state.raf = requestAnimationFrame(frame);
  };
  const enableSensors = async () => {
    if (!('DeviceMotionEvent' in window)) { setStatus('t11.sensor_unavailable'); begin(false); return; }
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const result = await DeviceMotionEvent.requestPermission();
        if (result !== 'granted') throw new Error('permission_denied');
      }
      window.addEventListener('devicemotion', onMotion, {passive:true});
      title.textContent = t('t11.ready');
      copy.textContent = t('t11.sensor_active');
      begin(true);
    } catch (error) {
      console.warn('Dino Dash sensors unavailable', error);
      setStatus('t11.sensor_unavailable');
      begin(false);
    }
  };
  sensorButton.addEventListener('click', enableSensors);
  touchButton.addEventListener('click', () => begin(false));
  jumpButton.addEventListener('pointerdown', (event) => { event.preventDefault(); beginManualJump(); });
  stage.addEventListener('pointerdown', (event) => { if (state.running) { event.preventDefault(); beginManualJump(); } });
  window.addEventListener('pointerup', releaseManualJump);
  window.addEventListener('pointercancel', releaseManualJump);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      if (!event.repeat) beginManualJump();
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') releaseManualJump();
  });
  updateHud(0);
})();
