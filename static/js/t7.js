(function(){
  const flow = window.jsdFlow;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t7')){
    return;
  }

  const root = document.getElementById('t7');
  if (!root){
    return;
  }

  function translate(key, params, fallback){
    const translator = window.i18n && typeof window.i18n === 'function' ? window.i18n : null;
    if (!translator){
      return fallback || key;
    }
    const value = translator(key, params || {});
    return value === key && fallback !== undefined ? fallback : value;
  }

  function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function settingNumber(value, min, max, fallback){
    const parsed = Number(value);
    return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
  }

  const settings = (window.jsdConfig && window.jsdConfig.settings) || {};
  const config = {
    lanes: Math.round(settingNumber(settings.drv_lane_count, 2, 5, 3)),
    durationMs: settingNumber(settings.drv_duration_ms, 5000, 120000, 45000),
    baseSpeed: settingNumber(settings.drv_initial_speed_px_s, 60, 500, 220),
    speedGrowthPerSecond: settingNumber(settings.drv_speed_growth_per_s, 0, 20, 3.2),
    spawnInterval: settingNumber(settings.drv_spawn_interval_ms, 200, 4000, 900),
    spawnIntervalDecayPerSecond: settingNumber(settings.drv_spawn_interval_decay_per_s, 0, 100, 12),
    spawnJitter: settingNumber(settings.drv_spawn_jitter_ms, 0, 3000, 260),
    laneChangeChance: settingNumber(settings.drv_lane_change_chance, 0, 1, 0.22),
    laneChangeWarningMs: settingNumber(settings.drv_lane_change_warning_ms, 300, 2000, 900),
    laneChangeDurationMs: settingNumber(settings.drv_lane_change_duration_ms, 300, 2000, 800),
    collisionPenalty: settingNumber(settings.drv_collision_penalty, 0, 50, 18),
    maxCollisions: Math.max(1, Math.round(settingNumber(settings.drv_max_collisions, 1, 20, 6))),
    timeWeight: settingNumber(settings.drv_time_weight, 0, 1, 0.6),
    avoidWeight: settingNumber(settings.drv_avoid_weight, 0, 1, 0.4)
  };

  const weightSum = config.timeWeight + config.avoidWeight;
  if (weightSum <= 0){
    config.timeWeight = 0.6;
    config.avoidWeight = 0.4;
  } else {
    config.timeWeight /= weightSum;
    config.avoidWeight /= weightSum;
  }

  const style = document.createElement('style');
  style.textContent = `
    #t7 .t7-wrapper{display:flex;flex-direction:column;gap:1rem;}
    #t7 .t7-hud{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.55rem;}
    #t7 .t7-chip{min-width:0;padding:0.65rem 0.55rem;border:1px solid rgba(148,163,184,0.22);border-radius:16px;background:rgba(248,250,252,0.92);color:#334155;text-align:center;font-size:0.75rem;font-weight:800;line-height:1.25;}
    #t7 .t7-speed{border-color:rgba(45,212,191,0.28);background:rgba(240,253,250,0.92);color:#0f766e;}
    #t7 .t7-distance{border-color:rgba(96,165,250,0.28);background:rgba(239,246,255,0.94);color:#1d4ed8;}
    #t7 .t7-collisions{border-color:rgba(251,146,60,0.3);background:rgba(255,247,237,0.94);color:#c2410c;}
    #t7 .t7-score{border-color:rgba(244,63,94,0.22);background:rgba(255,241,242,0.92);color:#be123c;}
    html.dark #t7 .t7-chip{border-color:rgba(148,163,184,0.28);background:rgba(15,23,42,0.72);color:#e2e8f0;}
    html.dark #t7 .t7-speed{border-color:rgba(45,212,191,0.32);background:rgba(13,148,136,0.16);color:#99f6e4;}
    html.dark #t7 .t7-distance{border-color:rgba(96,165,250,0.32);background:rgba(30,64,175,0.2);color:#bfdbfe;}
    html.dark #t7 .t7-collisions{border-color:rgba(251,146,60,0.3);background:rgba(154,52,18,0.2);color:#fed7aa;}
    html.dark #t7 .t7-score{border-color:rgba(244,63,94,0.3);background:rgba(136,19,55,0.2);color:#fecdd3;}
    #t7 .t7-stage{width:100%;max-width:380px;margin:0 auto;padding:8px;border:4px solid rgba(255,255,255,0.75);border-radius:28px;background:rgba(15,23,42,0.10);box-shadow:0 24px 50px -28px rgba(15,23,42,0.75);}
    #t7 .t7-canvas{display:block;width:100%;height:auto;border-radius:20px;touch-action:none;cursor:pointer;}
    #t7 .t7-message{min-height:2.8rem;display:grid;place-items:center;padding:0.75rem 1rem;border:1px solid rgba(16,185,129,0.24);border-radius:16px;background:rgba(236,253,245,0.8);color:#14532d;text-align:center;font-size:0.9rem;font-weight:800;}
    html.dark #t7 .t7-message{border-color:rgba(52,211,153,0.28);background:rgba(6,78,59,0.24);color:#d1fae5;}
    #t7 .t7-help{color:#64748b;text-align:center;font-size:0.8rem;font-weight:600;}
    html.dark #t7 .t7-help{color:#cbd5e1;}
    #t7 .t7-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.7rem;width:100%;max-width:380px;margin:0 auto;}
    #t7 .t7-btn{min-height:3.2rem;padding:0.7rem 1rem;border:1px solid rgba(244,63,94,0.24);border-radius:16px;background:#f43f5e;color:#fff;font-size:1rem;font-weight:900;box-shadow:0 14px 24px -18px rgba(190,24,93,0.9);transition:transform 120ms ease,filter 120ms ease;touch-action:manipulation;}
    #t7 .t7-btn:not(:disabled):active{transform:translateY(1px) scale(0.98);filter:brightness(0.96);}
    #t7 .t7-secondary{border-color:rgba(16,185,129,0.28);background:rgba(16,185,129,0.12);color:#047857;box-shadow:none;}
    html.dark #t7 .t7-secondary{border-color:rgba(52,211,153,0.32);background:rgba(16,185,129,0.16);color:#a7f3d0;}
    #t7 .t7-start-wrapper{display:flex;justify-content:center;}
    #t7 .t7-start{min-width:12rem;}
    #t7 .t7-btn:disabled{opacity:0.55;cursor:default;box-shadow:none;}
    @media (min-width:640px){
      #t7 .t7-hud{grid-template-columns:repeat(5,minmax(0,1fr));}
      #t7 .t7-stage{padding:10px;}
    }
  `;
  document.head.appendChild(style);

  function el(tag, className, text){
    const node = document.createElement(tag);
    if (className){
      node.className = className;
    }
    if (text !== undefined){
      node.textContent = text;
    }
    return node;
  }

  const wrapper = el('div', 't7-wrapper');
  const hud = el('div', 't7-hud');
  const timerChip = el('div', 't7-chip t7-timer');
  const speedChip = el('div', 't7-chip t7-speed');
  const distanceChip = el('div', 't7-chip t7-distance');
  const collisionChip = el('div', 't7-chip t7-collisions');
  const scoreChip = el('div', 't7-chip t7-score');
  hud.append(timerChip, speedChip, distanceChip, collisionChip, scoreChip);

  const stage = el('div', 't7-stage');
  const canvas = document.createElement('canvas');
  canvas.className = 't7-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', translate('t7.canvas_label', null, 'Route de conduite interactive'));
  canvas.style.touchAction = 'none';
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const messageEl = el('div', 't7-message', translate('t7.help', null, 'Reste sur la route et change de voie pour éviter les obstacles.'));
  messageEl.setAttribute('aria-live', 'polite');
  const helpEl = el('div', 't7-help', translate('t7.controls_hint', null, 'Utilise les boutons, les flèches ou touche le côté gauche/droit. Un clignotant jaune annonce les changements de voie.'));

  const controls = el('div', 't7-controls');
  const leftBtn = el('button', 't7-btn t7-secondary', `←  ${translate('t7.left_button', null, 'Gauche')}`);
  const rightBtn = el('button', 't7-btn t7-secondary', `${translate('t7.right_button', null, 'Droite')}  →`);
  leftBtn.type = 'button';
  rightBtn.type = 'button';
  leftBtn.setAttribute('aria-label', translate('t7.left_button', null, 'Gauche'));
  rightBtn.setAttribute('aria-label', translate('t7.right_button', null, 'Droite'));
  controls.append(leftBtn, rightBtn);

  const startWrapper = el('div', 't7-start-wrapper');
  const startBtn = el('button', 't7-btn t7-start', translate('t7.start_button', null, 'Démarrer'));
  startBtn.type = 'button';
  startWrapper.appendChild(startBtn);

  wrapper.append(hud, stage, messageEl, helpEl, controls, startWrapper);
  root.appendChild(wrapper);

  const game = {
    width: 360,
    height: 600,
    roadLeft: 48,
    roadRight: 312,
    laneWidth: 88,
    playerWidth: 46,
    playerHeight: 72,
    playerY: 480,
    playerBottom: 42
  };

  const state = {
    lane: Math.floor(config.lanes / 2),
    obstacles: [],
    elapsed: 0,
    distance: 0,
    collisions: 0,
    spawned: 0,
    avoided: 0,
    phase: 'idle',
    nextSpawn: config.spawnInterval,
    roadOffset: 0,
    lastTimestamp: 0,
    flashUntil: 0
  };

  const VEHICLES = [
    { color: '#fb7185', accent: '#ffe4e6' },
    { color: '#f59e0b', accent: '#fef3c7' },
    { color: '#38bdf8', accent: '#e0f2fe' },
    { color: '#a78bfa', accent: '#ede9fe' },
    { color: '#34d399', accent: '#d1fae5' },
    { color: '#f97316', accent: '#ffedd5' }
  ];

  function roundedRect(context, x, y, width, height, radius){
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function laneCenter(lane){
    return game.roadLeft + game.laneWidth * (lane + 0.5);
  }

  function currentSpeed(){
    return config.baseSpeed + config.speedGrowthPerSecond * (state.elapsed / 1000);
  }

  function currentSpawnInterval(){
    return Math.max(200, config.spawnInterval - config.spawnIntervalDecayPerSecond * (state.elapsed / 1000));
  }

  function vehicleDimensions(){
    return {
      width: game.laneWidth * 0.58,
      height: Math.max(48, game.height * 0.105)
    };
  }

  function updateTrackMetrics(){
    const rect = stage.getBoundingClientRect();
    const availableWidth = Math.max(240, (rect.width || 380) - 20);
    const previousHeight = game.height;
    game.width = Math.round(Math.min(380, availableWidth));
    game.height = Math.round(game.width * (5 / 3));
    game.roadLeft = game.width * 0.13;
    game.roadRight = game.width * 0.87;
    game.laneWidth = (game.roadRight - game.roadLeft) / config.lanes;
    game.playerWidth = game.laneWidth * 0.58;
    game.playerHeight = Math.max(48, game.height * 0.105);
    game.playerBottom = game.height * 0.07;
    game.playerY = game.height - game.playerHeight - game.playerBottom;
    canvas.width = game.width;
    canvas.height = game.height;
    if (previousHeight > 0 && state.obstacles.length){
      const ratio = game.height / previousHeight;
      state.obstacles.forEach((obstacle) => { obstacle.y *= ratio; });
    }
    render(performance.now());
  }

  function moveLane(delta){
    if (state.phase !== 'running' || !Number.isFinite(delta)){
      return;
    }
    state.lane = clamp(state.lane + Math.trunc(delta), 0, config.lanes - 1);
  }

  function scheduleNextSpawn(){
    const jitter = config.spawnJitter > 0 ? (Math.random() * config.spawnJitter * 2 - config.spawnJitter) : 0;
    state.nextSpawn = Math.max(200, currentSpawnInterval() + jitter);
  }

  function spawnObstacle(){
    const dimensions = vehicleDimensions();
    const occupiedNearTop = new Set(
      state.obstacles
        .filter((obstacle) => obstacle.y < game.height * 0.28)
        .map((obstacle) => Math.round(obstacle.lanePosition))
    );
    const available = [];
    for (let lane = 0; lane < config.lanes; lane += 1){
      if (!occupiedNearTop.has(lane)){
        available.push(lane);
      }
    }
    const pool = available.length ? available : Array.from({length: config.lanes}, (_, index) => index);
    const lane = pool[Math.floor(Math.random() * pool.length)];
    state.obstacles.push({
      lane,
      lanePosition: lane,
      targetLane: lane,
      y: -dimensions.height - 18,
      width: dimensions.width,
      height: dimensions.height,
      vehicle: VEHICLES[Math.floor(Math.random() * VEHICLES.length)],
      collided: false,
      counted: false,
      hitAt: 0,
      laneChange: null,
      laneChangeTimerMs: 700 + Math.random() * 900
    });
    state.spawned += 1;
  }

  function chooseLaneChangeTarget(obstacle){
    const currentLane = Math.round(obstacle.lanePosition);
    const candidates = [currentLane - 1, currentLane + 1]
      .filter((lane) => lane >= 0 && lane < config.lanes);
    const safeCandidates = candidates.filter((lane) => !state.obstacles.some((other) => {
      if (other === obstacle){
        return false;
      }
      const sameDepth = Math.abs(other.y - obstacle.y) < game.playerHeight * 2.2;
      const sameLane = Math.abs((other.lanePosition ?? other.lane) - lane) < 0.72;
      return sameDepth && sameLane;
    }));
    const pool = safeCandidates.length ? safeCandidates : candidates;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  function startLaneChange(obstacle){
    const targetLane = chooseLaneChangeTarget(obstacle);
    if (targetLane == null){
      return;
    }
    obstacle.targetLane = targetLane;
    obstacle.laneChange = {
      fromLane: obstacle.lanePosition,
      targetLane,
      phase: 'warning',
      remainingMs: config.laneChangeWarningMs,
      elapsedMs: 0
    };
  }

  function updateLaneChange(obstacle, deltaMs){
    if (obstacle.laneChange){
      const change = obstacle.laneChange;
      if (change.phase === 'warning'){
        change.remainingMs -= deltaMs;
        if (change.remainingMs <= 0){
          change.phase = 'moving';
          change.elapsedMs = 0;
        }
        return;
      }
      change.elapsedMs += deltaMs;
      const ratio = clamp(change.elapsedMs / config.laneChangeDurationMs, 0, 1);
      const eased = ratio * ratio * (3 - 2 * ratio);
      obstacle.lanePosition = change.fromLane + (change.targetLane - change.fromLane) * eased;
      if (ratio >= 1){
        obstacle.lanePosition = change.targetLane;
        obstacle.lane = change.targetLane;
        obstacle.laneChange = null;
      }
      return;
    }
    obstacle.laneChangeTimerMs -= deltaMs;
    if (obstacle.laneChangeTimerMs <= 0 && obstacle.y > 0 && obstacle.y < game.playerY - game.playerHeight * 0.45){
      if (Math.random() < config.laneChangeChance){
        startLaneChange(obstacle);
      } else {
        obstacle.laneChangeTimerMs = Number.POSITIVE_INFINITY;
      }
    }
  }

  function computeScore(){
    const elapsedRatio = config.durationMs > 0 ? clamp(state.elapsed / config.durationMs, 0, 1) : 0;
    const avoidanceRatio = state.spawned > 0 ? clamp(state.avoided / state.spawned, 0, 1) : elapsedRatio;
    const base = (elapsedRatio * config.timeWeight) + (avoidanceRatio * config.avoidWeight);
    const penalty = state.collisions * config.collisionPenalty / 100;
    return Math.round(clamp(base - penalty, 0, 1) * 100);
  }

  function updateHud(){
    const remainingSeconds = Math.ceil(Math.max(0, config.durationMs - state.elapsed) / 1000);
    const distanceMeters = state.distance / 100;
    const speed = Math.round(currentSpeed());
    timerChip.textContent = translate('t7.timer_label', { remaining: remainingSeconds }, `${remainingSeconds}s`);
    speedChip.textContent = translate('t7.speed_label', { speed }, `${speed} px/s`);
    distanceChip.textContent = translate('t7.distance_label', { distance: distanceMeters.toFixed(distanceMeters >= 100 ? 0 : 1) }, `${distanceMeters.toFixed(1)} m`);
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
      elapsed_ms: elapsedMs
    };
    try {
      localStorage.setItem('jsd:drv', JSON.stringify(payload));
      localStorage.setItem('jsd:done:t7', '1');
    } catch (err){}
    enableNextButton();
  }

  function finishGame(reason){
    if (state.phase === 'finished'){
      return;
    }
    state.phase = 'finished';
    const finalScore = computeScore();
    if (reason === 'crash'){
      messageEl.textContent = translate('t7.crash_message', { score: finalScore }, `Accident ! Score ${finalScore}/100`);
    } else {
      messageEl.textContent = translate('t7.success_message', { score: finalScore }, `Trajet terminé · Score ${finalScore}/100`);
    }
    startBtn.hidden = true;
    storeResult();
  }

  function resetForRun(){
    state.obstacles = [];
    state.lane = Math.floor(config.lanes / 2);
    state.elapsed = 0;
    state.distance = 0;
    state.collisions = 0;
    state.spawned = 0;
    state.avoided = 0;
    state.phase = 'idle';
    state.nextSpawn = config.spawnInterval;
    state.roadOffset = 0;
    state.lastTimestamp = 0;
    state.flashUntil = 0;
    startBtn.textContent = translate('t7.start_button', null, 'Démarrer');
    startBtn.disabled = false;
    startBtn.hidden = false;
    messageEl.textContent = translate('t7.help', null, 'Reste sur la route et change de voie pour éviter les obstacles.');
    try {
      localStorage.removeItem('jsd:drv');
      localStorage.removeItem('jsd:done:t7');
    } catch (err){}
    updateHud();
    render(performance.now());
  }

  function restoreResult(){
    let payload = null;
    try {
      payload = JSON.parse(localStorage.getItem('jsd:drv') || 'null');
    } catch (err){}
    if (!payload || typeof payload !== 'object'){
      updateHud();
      return;
    }
    state.collisions = Math.max(0, Math.trunc(payload.collisions || 0));
    state.spawned = Math.max(0, Math.trunc(payload.obstacles || 0));
    state.avoided = Math.max(0, Math.trunc(payload.avoided || 0));
    const distance = Number(payload.distance_m);
    const elapsed = Number(payload.elapsed_ms);
    state.distance = Number.isFinite(distance) ? distance * 100 : 0;
    state.elapsed = Number.isFinite(elapsed) ? clamp(elapsed, 0, config.durationMs) : config.durationMs;
    state.phase = 'finished';
    updateHud();
    const finalScore = Number.isFinite(Number(payload.score)) ? clamp(Math.round(Number(payload.score)), 0, 100) : computeScore();
    messageEl.textContent = translate('t7.success_message', { score: finalScore }, `Trajet terminé · Score ${finalScore}/100`);
    startBtn.hidden = true;
    enableNextButton();
    render(performance.now());
  }

  function intersectsPlayer(obstacle){
    if (obstacle.collided){
      return false;
    }
    const dimensions = vehicleDimensions();
    const playerLeft = laneCenter(state.lane) - game.playerWidth / 2 + 8;
    const playerRight = laneCenter(state.lane) + game.playerWidth / 2 - 8;
    const obstacleLeft = laneCenter(obstacle.lanePosition) - dimensions.width / 2 + 8;
    const obstacleRight = laneCenter(obstacle.lanePosition) + dimensions.width / 2 - 8;
    const playerTop = game.playerY + 8;
    const playerBottom = game.playerY + game.playerHeight - 8;
    const obstacleTop = obstacle.y + 8;
    const obstacleBottom = obstacle.y + obstacle.height - 8;
    return obstacleRight >= playerLeft && obstacleLeft <= playerRight && obstacleBottom >= playerTop && obstacleTop <= playerBottom;
  }

  function updateGame(deltaMs, now){
    const deltaSeconds = deltaMs / 1000;
    state.elapsed += deltaMs;
    const speed = currentSpeed();
    state.distance += speed * deltaSeconds;
    state.roadOffset = (state.roadOffset + speed * deltaSeconds) % 120;
    state.nextSpawn -= deltaMs;
    while (state.nextSpawn <= 0){
      spawnObstacle();
      scheduleNextSpawn();
    }

    const active = [];
    for (const obstacle of state.obstacles){
      obstacle.y += speed * deltaSeconds;
      updateLaneChange(obstacle, deltaMs);
      if (intersectsPlayer(obstacle)){
        obstacle.collided = true;
        obstacle.hitAt = now;
        state.collisions += 1;
        state.flashUntil = now + 260;
        const remaining = Math.max(0, config.maxCollisions - state.collisions);
        if (remaining > 0){
          messageEl.textContent = translate('t7.hit_message', { remaining }, `Attention ! Plus que ${remaining} collisions.`);
        }
        if (state.collisions >= config.maxCollisions){
          finishGame('crash');
        }
      }
      if (!obstacle.counted && obstacle.y > game.playerY + game.playerHeight){
        obstacle.counted = true;
        if (!obstacle.collided){
          state.avoided += 1;
        }
      }
      if (obstacle.y < game.height + 100){
        active.push(obstacle);
      }
    }
    state.obstacles = active;
    updateHud();
    if (state.elapsed >= config.durationMs){
      finishGame('complete');
    }
  }

  function drawRoad(){
    const width = game.width;
    const height = game.height;
    const grass = ctx.createLinearGradient(0, 0, 0, height);
    grass.addColorStop(0, '#bbf7d0');
    grass.addColorStop(1, '#34d399');
    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    for (let y = -80 + (state.roadOffset % 100); y < height + 80; y += 100){
      ctx.beginPath();
      ctx.arc(game.roadLeft * 0.52, y, 3, 0, Math.PI * 2);
      ctx.arc(width - game.roadLeft * 0.52, y + 48, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#475569';
    ctx.fillRect(game.roadLeft, 0, game.roadRight - game.roadLeft, height);
    ctx.fillStyle = 'rgba(15,23,42,0.16)';
    ctx.fillRect(game.roadLeft, 0, 5, height);
    ctx.fillRect(game.roadRight - 5, 0, 5, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.74)';
    ctx.lineWidth = Math.max(2, game.width * 0.008);
    ctx.setLineDash([32, 24]);
    ctx.lineDashOffset = state.roadOffset;
    for (let lane = 1; lane < config.lanes; lane += 1){
      const x = game.roadLeft + game.laneWidth * lane;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(game.roadLeft - 2, 0, 2, height);
    ctx.fillRect(game.roadRight, 0, 2, height);
  }

  function drawVehicle(x, y, width, height, vehicle, isPlayer, now){
    const styleVehicle = isPlayer ? vehicle : vehicle.vehicle;
    const hit = !isPlayer && now - vehicle.hitAt < 320;
    ctx.save();
    if (hit){
      const shake = Math.sin((now - vehicle.hitAt) / 22) * 3;
      ctx.translate(shake, 0);
      ctx.globalAlpha = clamp(1 - (now - vehicle.hitAt) / 360, 0.15, 1);
    }
    ctx.fillStyle = 'rgba(15,23,42,0.28)';
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height + 6, width * 0.48, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createLinearGradient(x, y, x + width, y + height);
    body.addColorStop(0, isPlayer ? '#f43f5e' : styleVehicle.color);
    body.addColorStop(1, isPlayer ? '#be123c' : '#1e293b');
    ctx.fillStyle = body;
    roundedRect(ctx, x, y, width, height, width * 0.22);
    ctx.fill();
    ctx.strokeStyle = isPlayer ? 'rgba(255,255,255,0.74)' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(1.5, width * 0.04);
    ctx.stroke();

    ctx.fillStyle = isPlayer ? '#bae6fd' : styleVehicle.accent;
    roundedRect(ctx, x + width * 0.16, y + height * 0.20, width * 0.68, height * 0.32, width * 0.11);
    ctx.fill();
    ctx.fillStyle = 'rgba(15,23,42,0.26)';
    ctx.fillRect(x + width * 0.48, y + height * 0.22, Math.max(1, width * 0.04), height * 0.27);

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x + width * 0.22, y + height * 0.12, Math.max(2, width * 0.06), 0, Math.PI * 2);
    ctx.arc(x + width * 0.78, y + height * 0.12, Math.max(2, width * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(x + width * 0.18, y + height * 0.87, width * 0.18, Math.max(2, height * 0.035));
    ctx.fillRect(x + width * 0.64, y + height * 0.87, width * 0.18, Math.max(2, height * 0.035));

    const change = !isPlayer && vehicle.laneChange ? vehicle.laneChange : null;
    if (change){
      const blinkOn = change.phase === 'moving' || Math.floor(now / 180) % 2 === 0;
      if (blinkOn){
        const direction = change.targetLane > change.fromLane ? 1 : -1;
        const signalX = direction > 0 ? x + width * 0.96 : x + width * 0.04;
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(signalX, y + height * 0.16, Math.max(2.5, width * 0.07), 0, Math.PI * 2);
        ctx.arc(signalX, y + height * 0.84, Math.max(2.5, width * 0.07), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - width * 0.06, y + height * 0.22, width * 0.09, height * 0.2);
    ctx.fillRect(x + width * 0.97, y + height * 0.22, width * 0.09, height * 0.2);
    ctx.fillRect(x - width * 0.06, y + height * 0.65, width * 0.09, height * 0.2);
    ctx.fillRect(x + width * 0.97, y + height * 0.65, width * 0.09, height * 0.2);
    ctx.restore();
  }

  function drawOverlay(){
    if (state.phase === 'running'){
      return;
    }
    ctx.save();
    ctx.fillStyle = 'rgba(15,23,42,0.42)';
    ctx.fillRect(0, 0, game.width, game.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.max(20, game.width * 0.07)}px Inter, system-ui, sans-serif`;
    const title = state.phase === 'finished'
      ? translate('t7.canvas_finished', null, 'Trajet terminé')
      : state.phase === 'countdown'
        ? translate('t7.go', null, 'Go !')
        : translate('t7.canvas_idle', null, 'Prêt à conduire ?');
    ctx.fillText(title, game.width / 2, game.height * 0.42);
    if (state.phase === 'idle'){
      ctx.font = `700 ${Math.max(12, game.width * 0.035)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.fillText(translate('t7.canvas_start_hint', null, 'Appuie sur Démarrer'), game.width / 2, game.height * 0.49);
    }
    ctx.restore();
  }

  function render(now){
    if (!ctx || !game.width || !game.height){
      return;
    }
    ctx.clearRect(0, 0, game.width, game.height);
    drawRoad();
    const dimensions = vehicleDimensions();
    state.obstacles.forEach((obstacle) => {
      const x = laneCenter(obstacle.lanePosition) - dimensions.width / 2;
      drawVehicle(x, obstacle.y, dimensions.width, dimensions.height, obstacle, false, now);
    });
    const playerX = laneCenter(state.lane) - game.playerWidth / 2;
    drawVehicle(playerX, game.playerY, game.playerWidth, game.playerHeight, VEHICLES[0], true, now);
    if (state.flashUntil > now){
      ctx.fillStyle = `rgba(248,113,113,${clamp((state.flashUntil - now) / 260, 0, 0.28)})`;
      ctx.fillRect(0, 0, game.width, game.height);
    }
    drawOverlay();
  }

  function loop(timestamp){
    if (!state.lastTimestamp){
      state.lastTimestamp = timestamp;
    }
    const deltaMs = clamp(timestamp - state.lastTimestamp, 0, 50);
    state.lastTimestamp = timestamp;
    if (state.phase === 'running'){
      updateGame(deltaMs, timestamp);
    }
    render(timestamp);
    window.requestAnimationFrame(loop);
  }

  function handleStart(){
    if (state.phase === 'running' || state.phase === 'countdown'){
      return;
    }
    resetForRun();
    state.phase = 'countdown';
    startBtn.disabled = true;
    messageEl.textContent = translate('t7.countdown', null, 'Prêt ?');
    window.setTimeout(() => {
      if (state.phase !== 'countdown'){
        return;
      }
      state.phase = 'running';
      state.lastTimestamp = performance.now();
      messageEl.textContent = translate('t7.go', null, 'Go !');
    }, 800);
  }

  function handleCanvasPointer(event){
    if (state.phase !== 'running'){
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (!rect.width){
      return;
    }
    event.preventDefault();
    const pointX = (event.clientX - rect.left) * (canvas.width / rect.width);
    moveLane(pointX < canvas.width / 2 ? -1 : 1);
  }

  leftBtn.addEventListener('click', () => moveLane(-1));
  rightBtn.addEventListener('click', () => moveLane(1));
  startBtn.addEventListener('click', handleStart);
  canvas.addEventListener('pointerdown', handleCanvasPointer);
  document.addEventListener('keydown', (event) => {
    if (state.phase !== 'running' || event.repeat){
      return;
    }
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
    resizeObserver.observe(stage);
  } else {
    window.addEventListener('resize', updateTrackMetrics);
  }
  updateTrackMetrics();
  restoreResult();
  state.lastTimestamp = performance.now();
  window.requestAnimationFrame(loop);
})();
