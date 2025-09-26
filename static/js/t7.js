(function(){
  const flow = window.jsdFlow;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t7')){
    return;
  }

  const root = document.getElementById('t7');
  if (!root){
    return;
  }

  const translate = (key, params, fallback) => {
    const t = window.i18n && typeof window.i18n === 'function' ? window.i18n : null;
    if (!t){
      return fallback || key;
    }
    const translated = t(key, params);
    if (translated === key && fallback !== undefined){
      return fallback;
    }
    return translated;
  };

  const clampNumber = (value, min, max, fallback) => {
    const num = Number(value);
    if (!Number.isFinite(num)){
      return fallback;
    }
    if (min != null && num < min){
      return min;
    }
    if (max != null && num > max){
      return max;
    }
    return num;
  };

  const settings = (window.jsdConfig && window.jsdConfig.settings) || {};
  const config = {
    lanes: clampNumber(settings.drv_lane_count, 2, 5, 3) || 3,
    durationMs: clampNumber(settings.drv_duration_ms, 5000, 120000, 45000) || 45000,
    baseSpeed: clampNumber(settings.drv_initial_speed_px_s, 60, 500, 220) || 220,
    speedGrowthPerSecond: clampNumber(settings.drv_speed_growth_per_s, 0, 20, 3.2) || 3.2,
    spawnInterval: clampNumber(settings.drv_spawn_interval_ms, 200, 4000, 900) || 900,
    spawnJitter: clampNumber(settings.drv_spawn_jitter_ms, 0, 3000, 260) || 260,
    collisionPenalty: clampNumber(settings.drv_collision_penalty, 0, 50, 18) || 18,
    maxCollisions: Math.max(1, Math.round(clampNumber(settings.drv_max_collisions, 1, 20, 6) || 6)),
    timeWeight: clampNumber(settings.drv_time_weight, 0, 1, 0.6),
    avoidWeight: clampNumber(settings.drv_avoid_weight, 0, 1, 0.4),
  };

  const weightSum = (config.timeWeight || 0) + (config.avoidWeight || 0);
  if (weightSum <= 0){
    config.timeWeight = 0.6;
    config.avoidWeight = 0.4;
  } else {
    config.timeWeight = config.timeWeight / weightSum;
    config.avoidWeight = config.avoidWeight / weightSum;
  }

  const laneWidthPercent = 100 / config.lanes;
  const vehicleWidthPercent = laneWidthPercent * 0.58;
  const laneOffsetPercent = (laneWidthPercent - vehicleWidthPercent) / 2;

  const style = document.createElement('style');
  style.textContent = `
    #t7 .t7-wrapper{display:flex;flex-direction:column;gap:1rem;}
    #t7 .t7-hud{display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:space-between;align-items:center;}
    #t7 .t7-chip{display:inline-flex;align-items:center;gap:0.35rem;padding:0.4rem 0.75rem;border-radius:9999px;font-weight:600;font-size:0.75rem;background:rgba(244,63,94,0.08);color:#be123c;}
    #t7 .dark .t7-chip{background:rgba(244,63,94,0.18);color:#fda4af;}
    #t7 .t7-track-wrapper{display:flex;justify-content:center;}
    #t7 .t7-track{position:relative;width:100%;max-width:360px;aspect-ratio:3/5;border-radius:18px;overflow:hidden;background:linear-gradient(180deg,rgba(15,23,42,0.85),rgba(30,41,59,0.95));box-shadow:inset 0 0 0 1px rgba(255,255,255,0.15),0 18px 45px -20px rgba(15,23,42,0.9);}
    #t7 .t7-track::before{content:'';position:absolute;inset:0;background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.08) 0,rgba(255,255,255,0.08) ${laneWidthPercent.toFixed(4)}%,transparent ${laneWidthPercent.toFixed(4)}%,transparent ${laneWidthPercent.toFixed(4)+2});pointer-events:none;}
    #t7 .t7-car{position:absolute;bottom:6%;height:16%;border-radius:16px;background:linear-gradient(135deg,#f59e0b,#f97316);box-shadow:0 14px 25px -12px rgba(251,146,60,0.9);display:flex;align-items:center;justify-content:center;color:#0f172a;font-weight:700;}
    #t7 .t7-obstacle{position:absolute;height:16%;border-radius:18px;background:rgba(255,255,255,0.92);box-shadow:0 12px 24px -16px rgba(15,23,42,0.9);display:flex;align-items:center;justify-content:center;font-size:1.8rem;pointer-events:none;}
    #t7 .dark .t7-obstacle{background:rgba(15,23,42,0.85);}
    #t7 .t7-message{font-size:0.9rem;font-weight:600;color:#1f2937;}
    #t7 .dark .t7-message{color:#e2e8f0;}
    #t7 .t7-controls{display:flex;gap:0.75rem;justify-content:center;}
    #t7 .t7-btn{padding:0.55rem 1.4rem;border-radius:9999px;font-weight:600;font-size:0.95rem;transition:transform 120ms ease, box-shadow 120ms ease;box-shadow:0 12px 24px -16px rgba(15,23,42,0.45);background:#f43f5e;color:white;}
    #t7 .t7-btn:disabled{opacity:0.5;cursor:default;box-shadow:none;}
    #t7 .t7-secondary{background:rgba(244,63,94,0.12);color:#f43f5e;box-shadow:none;border:1px solid rgba(244,63,94,0.2);} 
    #t7 .dark .t7-secondary{background:rgba(244,114,182,0.18);color:#fbcfe8;border-color:rgba(244,114,182,0.25);} 
    #t7 .t7-btn:not(:disabled):active{transform:scale(0.98);} 
    #t7 .t7-help{font-size:0.8rem;color:#475569;} 
    #t7 .dark .t7-help{color:#cbd5f5;} 
    #t7 .t7-obstacle.t7-hit{animation:t7-hit 320ms ease forwards;} 
    @keyframes t7-hit{0%{transform:scale(1);}60%{transform:scale(1.18);}100%{transform:scale(0.2);opacity:0;}}
  `;
  document.head.appendChild(style);

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls){
      node.className = cls;
    }
    if (text !== undefined){
      node.textContent = text;
    }
    return node;
  };

  const wrapper = el('div', 't7-wrapper');
  root.appendChild(wrapper);

  const hud = el('div', 't7-hud');
  const timerChip = el('div', 't7-chip');
  const distanceChip = el('div', 't7-chip');
  const collisionChip = el('div', 't7-chip');
  const scoreChip = el('div', 't7-chip');
  hud.append(timerChip, distanceChip, collisionChip, scoreChip);

  const trackWrapper = el('div', 't7-track-wrapper');
  const track = el('div', 't7-track');
  trackWrapper.appendChild(track);

  const car = el('div', 't7-car', '🚙');
  track.appendChild(car);

  const messageEl = el('div', 't7-message', translate('t7.help', null, 'Dirige la voiture avec les flèches gauche/droite.'));
  const helpEl = el('div', 't7-help', translate('t7.controls_hint', null, 'Astuce : utilise ← → ou les boutons pour te faufiler.'));

  const controls = el('div', 't7-controls');
  const leftBtn = el('button', 't7-btn t7-secondary', translate('t7.left_button', null, 'Gauche'));
  leftBtn.type = 'button';
  const rightBtn = el('button', 't7-btn t7-secondary', translate('t7.right_button', null, 'Droite'));
  rightBtn.type = 'button';
  controls.append(leftBtn, rightBtn);

  const startBtn = el('button', 't7-btn', translate('t7.start_button', null, 'Démarrer'));
  startBtn.type = 'button';
  const startWrapper = el('div', 'flex justify-center');
  startWrapper.appendChild(startBtn);

  wrapper.append(hud, trackWrapper, messageEl, helpEl, controls, startWrapper);

  const state = {
    lane: Math.floor(config.lanes / 2),
    obstacles: [],
    elapsed: 0,
    distance: 0,
    collisions: 0,
    spawned: 0,
    avoided: 0,
    running: false,
    finished: false,
    lastTimestamp: 0,
    nextSpawn: config.spawnInterval,
    trackHeight: 0,
    trackWidth: 0,
  };

  const OBSTACLES = ['🚗', '🚕', '🐶', '🚶', '🛵', '🚓', '🦌'];

  function updateTrackMetrics(){
    const rect = track.getBoundingClientRect();
    const previousHeight = state.trackHeight || rect.height;
    state.trackHeight = rect.height || 0;
    state.trackWidth = rect.width || 0;
    if (previousHeight > 0 && state.trackHeight > 0 && previousHeight !== state.trackHeight){
      const ratio = state.trackHeight / previousHeight;
      state.obstacles.forEach((obs) => {
        obs.y *= ratio;
      });
    }
    car.style.width = `${vehicleWidthPercent}%`;
    updateCarPosition();
  }

  function updateCarPosition(){
    const leftPercent = laneOffsetPercent + state.lane * laneWidthPercent;
    car.style.left = `${leftPercent}%`;
  }

  function moveLane(delta){
    if (!Number.isFinite(delta)) return;
    const nextLane = Math.max(0, Math.min(config.lanes - 1, state.lane + delta));
    if (nextLane !== state.lane){
      state.lane = nextLane;
      updateCarPosition();
    }
  }

  function scheduleNextSpawn(){
    const base = config.spawnInterval;
    const jitter = config.spawnJitter;
    const offset = jitter > 0 ? (Math.random() * jitter * 2 - jitter) : 0;
    state.nextSpawn = Math.max(160, base + offset);
  }

  function spawnObstacle(){
    if (state.trackHeight <= 0){
      return;
    }
    let lane = Math.floor(Math.random() * config.lanes);
    const available = [];
    for (let i = 0; i < config.lanes; i += 1){
      const conflict = state.obstacles.some((obs) => obs.lane === i && obs.y < state.trackHeight * 0.35);
      if (!conflict){
        available.push(i);
      }
    }
    if (available.length){
      lane = available[Math.floor(Math.random() * available.length)];
    }

    const obstacle = el('div', 't7-obstacle', OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)]);
    obstacle.style.width = `${vehicleWidthPercent}%`;
    const leftPercent = laneOffsetPercent + lane * laneWidthPercent;
    obstacle.style.left = `${leftPercent}%`;
    obstacle.style.transform = 'translateY(-120%)';
    track.appendChild(obstacle);

    const entry = {
      lane,
      y: -state.trackHeight * 0.2,
      el: obstacle,
      collided: false,
      counted: false,
    };
    state.obstacles.push(entry);
    state.spawned += 1;
  }

  function clearObstacles(){
    state.obstacles.forEach((obs) => {
      if (obs.el && obs.el.parentNode){
        obs.el.parentNode.removeChild(obs.el);
      }
    });
    state.obstacles = [];
  }

  function computeScore(){
    if (config.durationMs <= 0){
      return 0;
    }
    const elapsedRatio = Math.min(1, state.elapsed / config.durationMs);
    const avoidanceRatio = state.spawned > 0
      ? Math.min(1, state.avoided / state.spawned)
      : elapsedRatio;
    const base = (elapsedRatio * config.timeWeight) + (avoidanceRatio * config.avoidWeight);
    const penalty = state.collisions * config.collisionPenalty / 100;
    const score = Math.max(0, Math.min(1, base - penalty));
    return Math.max(0, Math.min(100, Math.round(score * 100)));
  }

  function updateHud(){
    const remainingMs = Math.max(0, config.durationMs - state.elapsed);
    const remainingSeconds = Math.round(remainingMs / 1000);
    timerChip.textContent = translate('t7.timer_label', { remaining: remainingSeconds }, `${remainingSeconds}s`);
    const distanceMeters = state.distance / 100;
    distanceChip.textContent = translate('t7.distance_label', { distance: distanceMeters.toFixed(distanceMeters >= 100 ? 0 : 1) }, `${distanceMeters.toFixed(distanceMeters >= 100 ? 0 : 1)} m`);
    collisionChip.textContent = translate('t7.collisions_label', { value: state.collisions, limit: config.maxCollisions }, `${state.collisions}/${config.maxCollisions}`);
    scoreChip.textContent = translate('t7.score_chip', { score: computeScore() }, `${computeScore()}/100`);
  }

  function enableNextButton(){
    const next = document.getElementById('next');
    if (next){
      next.classList.remove('opacity-50', 'pointer-events-none');
    }
  }

  function storeResult(){
    const elapsedMs = Math.min(config.durationMs, Math.round(state.elapsed));
    const distanceMeters = state.distance / 100;
    const payload = {
      score: computeScore(),
      collisions: state.collisions,
      avoided: state.avoided,
      obstacles: state.spawned,
      distance_m: Number.isFinite(distanceMeters) ? Number(distanceMeters.toFixed(distanceMeters >= 100 ? 0 : 1)) : null,
      elapsed_ms: elapsedMs,
    };
    try {
      localStorage.setItem('jsd:drv', JSON.stringify(payload));
      localStorage.setItem('jsd:done:t7', '1');
    } catch (err){}
    enableNextButton();
  }

  function finishGame(reason){
    if (state.finished){
      return;
    }
    state.running = false;
    state.finished = true;
    const finalScore = computeScore();
    if (reason === 'crash'){
      messageEl.textContent = translate('t7.crash_message', { score: finalScore }, `Accident ! Score ${finalScore}/100`);
    } else {
      messageEl.textContent = translate('t7.success_message', { score: finalScore }, `Trajet terminé ! Score ${finalScore}/100`);
    }
    startBtn.textContent = translate('t7.retry_button', null, 'Rejouer');
    startBtn.disabled = false;
    storeResult();
  }

  function resetForRun(){
    clearObstacles();
    state.elapsed = 0;
    state.distance = 0;
    state.collisions = 0;
    state.spawned = 0;
    state.avoided = 0;
    state.running = false;
    state.finished = false;
    state.lastTimestamp = 0;
    scheduleNextSpawn();
    state.lane = Math.floor(config.lanes / 2);
    updateCarPosition();
    messageEl.textContent = translate('t7.help', null, 'Dirige la voiture avec les flèches gauche/droite.');
    startBtn.textContent = translate('t7.start_button', null, 'Démarrer');
    try {
      localStorage.removeItem('jsd:drv');
      localStorage.removeItem('jsd:done:t7');
    } catch (err){}
    updateHud();
  }

  function restoreResult(){
    let payload = null;
    try {
      payload = JSON.parse(localStorage.getItem('jsd:drv') || 'null');
    } catch (err){}
    if (payload && typeof payload === 'object'){
      state.collisions = Math.max(0, Math.trunc(payload.collisions || 0));
      state.spawned = Math.max(0, Math.trunc(payload.obstacles || 0));
      state.avoided = Math.max(0, Math.trunc(payload.avoided || 0));
      const storedDistance = Number(payload.distance_m);
      if (Number.isFinite(storedDistance)){
        state.distance = storedDistance * 100;
      }
      const storedElapsed = Number(payload.elapsed_ms);
      if (Number.isFinite(storedElapsed)){
        state.elapsed = Math.min(config.durationMs, Math.max(0, storedElapsed));
      } else {
        state.elapsed = config.durationMs;
      }
      state.finished = true;
      state.running = false;
      updateHud();
      const finalScore = Number.isFinite(payload.score) ? Math.max(0, Math.round(payload.score)) : computeScore();
      messageEl.textContent = translate('t7.success_message', { score: finalScore }, `Trajet terminé ! Score ${finalScore}/100`);
      startBtn.textContent = translate('t7.retry_button', null, 'Rejouer');
      startBtn.disabled = false;
      enableNextButton();
    } else {
      updateHud();
    }
  }

  function loop(timestamp){
    if (!state.running){
      return;
    }
    if (!state.lastTimestamp){
      state.lastTimestamp = timestamp;
    }
    const delta = Math.max(0, Math.min(120, timestamp - state.lastTimestamp));
    state.lastTimestamp = timestamp;
    state.elapsed += delta;
    const elapsedSeconds = state.elapsed / 1000;
    const currentSpeed = config.baseSpeed + config.speedGrowthPerSecond * elapsedSeconds;
    state.distance += currentSpeed * (delta / 1000);

    state.nextSpawn -= delta;
    if (state.nextSpawn <= 0){
      spawnObstacle();
      scheduleNextSpawn();
    }

    const obstacleHeight = state.trackHeight * 0.16;
    const carTop = state.trackHeight * 0.22;
    const carBottom = state.trackHeight - state.trackHeight * 0.08;

    const stillActive = [];
    for (const obs of state.obstacles){
      obs.y += currentSpeed * (delta / 1000);
      if (obs.el){
        obs.el.style.transform = `translateY(${(obs.y / state.trackHeight) * 100}%)`;
      }
      if (!obs.collided && obs.lane === state.lane){
        const obsTop = obs.y;
        const obsBottom = obs.y + obstacleHeight;
        if (obsBottom >= carTop && obsTop <= carBottom){
          obs.collided = true;
          if (obs.el){
            obs.el.classList.add('t7-hit');
          }
          state.collisions += 1;
          const remaining = Math.max(0, config.maxCollisions - state.collisions);
          if (remaining > 0){
            messageEl.textContent = translate('t7.hit_message', { remaining }, `Oups ! Plus que ${remaining} chances.`);
          }
          if (state.collisions >= config.maxCollisions){
            finishGame('crash');
            break;
          }
        }
      }
      if (!obs.counted && obs.y > state.trackHeight){
        obs.counted = true;
        if (!obs.collided){
          state.avoided += 1;
        }
      }
      if (obs.y < state.trackHeight * 1.4){
        stillActive.push(obs);
      } else if (obs.el && obs.el.parentNode){
        obs.el.parentNode.removeChild(obs.el);
      }
    }
    state.obstacles = stillActive;

    updateHud();

    if (state.elapsed >= config.durationMs){
      finishGame('complete');
      return;
    }

    if (state.running){
      window.requestAnimationFrame(loop);
    }
  }

  function handleStart(){
    if (state.running){
      return;
    }
    resetForRun();
    startBtn.disabled = true;
    messageEl.textContent = translate('t7.countdown', null, 'Prêt ?');
    setTimeout(() => {
      if (state.finished){
        return;
      }
      state.running = true;
      state.lastTimestamp = 0;
      messageEl.textContent = translate('t7.go', null, 'Go !');
      window.requestAnimationFrame(loop);
    }, 800);
  }

  function handleMoveLeft(event){
    event && event.preventDefault();
    moveLane(-1);
  }

  function handleMoveRight(event){
    event && event.preventDefault();
    moveLane(1);
  }

  leftBtn.addEventListener('click', handleMoveLeft);
  rightBtn.addEventListener('click', handleMoveRight);
  leftBtn.addEventListener('pointerdown', handleMoveLeft);
  rightBtn.addEventListener('pointerdown', handleMoveRight);
  startBtn.addEventListener('click', handleStart);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A'){
      event.preventDefault();
      moveLane(-1);
    } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D'){
      event.preventDefault();
      moveLane(1);
    }
  });

  const resizeObserver = window.ResizeObserver ? new ResizeObserver(updateTrackMetrics) : null;
  if (resizeObserver){
    resizeObserver.observe(track);
  } else {
    window.addEventListener('resize', updateTrackMetrics);
  }
  updateTrackMetrics();
  restoreResult();
})();
