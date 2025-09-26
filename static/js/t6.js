(function(){
  const flow = window.jsdFlow || null;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t6')){
    return;
  }
  const root = document.getElementById('t6');
  if (!root){
    return;
  }
  const t = window.i18n || ((key, params) => key);

  function translate(key, params, fallback){
    if (typeof t === 'function'){
      const value = t(key, params || {});
      if (typeof value === 'string' && value !== key){
        return value;
      }
    }
    if (fallback !== undefined){
      return fallback;
    }
    return key;
  }

  function clamp(num, min, max){
    return Math.max(min, Math.min(max, num));
  }

  function parseNumber(value, fallback){
    if (value === undefined || value === null){
      return fallback;
    }
    const parsed = Number.parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function defaults(raw){
    const attempts = clamp(Math.round(parseNumber(raw.rfl_attempts, 5)), 1, 12);
    const velocityScale = clamp(parseNumber(raw.rfl_velocity_scale, 4.8), 1.5, 12);
    const gravity = clamp(parseNumber(raw.rfl_gravity, 1800), 400, 4000);
    let speedMin = clamp(parseNumber(raw.rfl_cup_speed_min, 70), 10, 400);
    let speedMax = clamp(parseNumber(raw.rfl_cup_speed_max, 160), 20, 500);
    if (speedMax < speedMin){
      const tmp = speedMax;
      speedMax = speedMin;
      speedMin = tmp;
    }
    let successWeight = clamp(parseNumber(raw.rfl_success_weight, 0.7), 0, 1);
    let accuracyWeight = clamp(parseNumber(raw.rfl_accuracy_weight, 0.3), 0, 1);
    if (successWeight <= 0 && accuracyWeight <= 0){
      successWeight = 0.7;
      accuracyWeight = 0.3;
    }
    const tolerance = clamp(parseNumber(raw.rfl_accuracy_tolerance_px, 60), 20, 240);
    return {
      attempts,
      velocityScale,
      gravity,
      speedMin,
      speedMax,
      successWeight,
      accuracyWeight,
      tolerance
    };
  }

  const rawSettings = (window.jsdConfig && window.jsdConfig.settings) || {};
  const config = defaults(rawSettings);

  function el(tag, cls, html){
    const node = document.createElement(tag);
    if (cls){
      node.className = cls;
    }
    if (html !== undefined){
      node.innerHTML = html;
    }
    return node;
  }

  const statsBar = el('div', 'flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200');
  const progressEl = el('span');
  const hitsEl = el('span');
  const scoreChip = el('span', 'px-3 py-1 rounded-full bg-rose-100/80 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200 text-xs font-bold');
  statsBar.append(progressEl, hitsEl, scoreChip);

  const defaultHelpText = translate('t6.help', null, 'Place ton doigt sur la balle, tire vers l’arrière puis relâche pour tirer.');
  const messageEl = el('div', 'text-sm text-slate-600 dark:text-slate-300', defaultHelpText);

  const canvasWrap = el('div', 'relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-b from-sky-100/60 to-emerald-100/50 shadow-inner dark:from-slate-900/70 dark:to-emerald-900/30');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvasWrap.append(canvas);

  const aimInfo = el('div', 'flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-700 dark:text-slate-200');
  const powerInfo = el('span');
  const powerLabel = el('span', '');
  powerLabel.textContent = `${translate('t6.power_label', null, 'Puissance')} : `;
  const powerValue = el('span', 'font-black text-base text-rose-600 dark:text-rose-300', '0%');
  powerInfo.append(powerLabel, powerValue);
  const angleInfo = el('span');
  const angleLabel = el('span', '');
  angleLabel.textContent = `${translate('t6.angle_label', null, 'Angle')} : `;
  const angleValue = el('span', 'font-black text-base text-rose-600 dark:text-rose-300', '0°');
  angleInfo.append(angleLabel, angleValue);
  aimInfo.append(powerInfo, angleInfo);

  const retryBtn = el('button', 'px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900/40 hidden', translate('t6.button_retry', null, 'Rejouer'));
  retryBtn.type = 'button';

  root.append(statsBar, messageEl, canvasWrap, aimInfo, retryBtn);

  const layout = {
    width: 360,
    height: 440,
    padding: 16,
    cupWidth: 80,
    cupHeight: 54,
    ballRadius: 8,
    groundOffset: 36,
    originX: 60,
    originY: 0,
    aimGuideLength: 140
  };

  const cup = {
    x: 0,
    y: 120,
    width: layout.cupWidth,
    height: layout.cupHeight,
    vx: 90
  };

  const state = {
    attempt: 0,
    hits: 0,
    bestError: Infinity,
    errorSum: 0,
    errorCount: 0,
    finished: false,
    shotActive: false,
    rafId: null,
    lastTime: performance.now(),
    ball: null,
    aim: {
      active: false,
      pointerId: null,
      x: 0,
      y: 0,
      power: 0,
      angle: 0,
      distance: 0
    }
  };

  function updateAimDisplay(powerRatio, angleRad){
    const powerPercent = clamp(Math.round(powerRatio * 100), 0, 100);
    powerValue.textContent = `${powerPercent}%`;
    if (Number.isFinite(angleRad)){
      const angleDeg = clamp(Math.round(angleRad * 180 / Math.PI), 0, 90);
      angleValue.textContent = `${angleDeg}°`;
    } else {
      angleValue.textContent = '0°';
    }
  }

  function resetAim(updateDisplay = true){
    state.aim.active = false;
    state.aim.pointerId = null;
    state.aim.distance = 0;
    state.aim.power = 0;
    state.aim.angle = 0;
    state.aim.x = layout.originX;
    state.aim.y = layout.originY;
    if (updateDisplay){
      updateAimDisplay(0, 0);
    }
  }

  resetAim(true);

  function randomBetween(min, max){
    return min + Math.random() * (max - min);
  }

  function resetCup(){
    cup.width = layout.cupWidth;
    cup.height = layout.cupHeight;
    cup.y = layout.height * 0.32;
    cup.x = randomBetween(layout.padding, layout.width - layout.padding - cup.width);
    const speed = randomBetween(config.speedMin, config.speedMax);
    cup.vx = speed * (Math.random() > 0.5 ? 1 : -1);
  }

  function resize(){
    const bounds = canvasWrap.getBoundingClientRect();
    const maxWidth = Math.min(window.innerWidth - 40, 420);
    const width = Math.max(280, Math.min(maxWidth, bounds.width || layout.width));
    const height = width * (layout.height / layout.width);
    layout.width = Math.round(width);
    layout.height = Math.round(height);
    layout.padding = Math.max(16, layout.width * 0.08);
    layout.originX = layout.width * 0.18;
    const ground = Math.max(layout.height * 0.08, 28);
    layout.groundOffset = ground;
    layout.originY = layout.height - ground;
    layout.cupWidth = layout.width * 0.22;
    layout.cupHeight = layout.height * 0.13;
    layout.ballRadius = layout.width * 0.022;
    layout.aimGuideLength = layout.width * 0.46;
    resetCup();
    canvas.width = layout.width;
    canvas.height = layout.height;
    if (!state.shotActive && !state.aim.active){
      resetAim();
    } else {
      state.aim.x = layout.originX;
      state.aim.y = layout.originY;
    }
  }

  function updateProgress(){
    progressEl.textContent = translate('t6.progress', { attempt: state.attempt, total: config.attempts }, `${state.attempt}/${config.attempts}`);
    hitsEl.textContent = translate('t6.hits', { hits: state.hits, attempts: config.attempts }, `${state.hits} ✔`);
    const currentScore = computeScore();
    scoreChip.textContent = translate('t6.score_chip', { score: currentScore }, `${currentScore}/100`);
  }

  function computeAccuracyComponents(){
    const best = state.bestError;
    const avg = state.errorCount > 0 ? state.errorSum / state.errorCount : Infinity;
    const bestNorm = Number.isFinite(best) ? clamp(1 - best / config.tolerance, 0, 1) : 0;
    const avgNorm = Number.isFinite(avg) ? clamp(1 - avg / (config.tolerance * 1.4), 0, 1) : 0;
    const combined = (bestNorm * 0.6) + (avgNorm * 0.4);
    return { bestNorm, avgNorm, combined };
  }

  function computeScore(){
    const successRatio = config.attempts > 0 ? state.hits / config.attempts : 0;
    const { combined } = computeAccuracyComponents();
    const totalWeight = config.successWeight + config.accuracyWeight;
    const successWeight = totalWeight > 0 ? config.successWeight / totalWeight : 0.7;
    const accuracyWeight = totalWeight > 0 ? config.accuracyWeight / totalWeight : 0.3;
    const raw = (successRatio * successWeight) + (combined * accuracyWeight);
    return Math.round(clamp(raw, 0, 1) * 100);
  }

  function storeResult(){
    const score = computeScore();
    const avgError = state.errorCount > 0 ? state.errorSum / state.errorCount : null;
    const payload = {
      score,
      hits: state.hits,
      attempts: config.attempts,
      best_error_px: Number.isFinite(state.bestError) ? Number(state.bestError) : null,
      avg_error_px: Number.isFinite(avgError) ? Number(avgError) : null,
      success_ratio: config.attempts > 0 ? state.hits / config.attempts : 0,
      accuracy: computeAccuracyComponents().combined
    };
    try {
      localStorage.setItem('jsd:rfl', JSON.stringify(payload));
      localStorage.setItem('jsd:done:t6', '1');
    } catch (err){}
    const next = document.getElementById('next');
    if (next){
      next.classList.remove('opacity-50', 'pointer-events-none');
    }
  }

  function restoreResult(){
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem('jsd:rfl') || 'null');
    } catch (err){}
    if (raw && typeof raw === 'object'){
      state.hits = Number.isFinite(raw.hits) ? Math.max(0, Math.trunc(raw.hits)) : 0;
      const storedAttempts = Number.isFinite(raw.attempts) ? Math.max(1, Math.trunc(raw.attempts)) : config.attempts;
      state.attempt = config.attempts;
      state.bestError = Number.isFinite(raw.best_error_px) ? Math.max(0, raw.best_error_px) : Infinity;
      if (Number.isFinite(raw.avg_error_px)){
        state.errorSum = Math.max(0, raw.avg_error_px) * storedAttempts;
        state.errorCount = storedAttempts;
      }
      state.finished = true;
      messageEl.textContent = translate('t6.final_message', { score: computeScore() }, `Score ${computeScore()}/100`);
      retryBtn.classList.remove('hidden');
      state.shotActive = false;
      state.ball = null;
      resetAim();
      try { localStorage.setItem('jsd:done:t6', '1'); } catch (err){}
      const next = document.getElementById('next');
      if (next){
        next.classList.remove('opacity-50', 'pointer-events-none');
      }
      updateProgress();
    }
  }

  function resetState(){
    state.attempt = 0;
    state.hits = 0;
    state.bestError = Infinity;
    state.errorSum = 0;
    state.errorCount = 0;
    state.finished = false;
    state.shotActive = false;
    state.ball = null;
    resetAim();
    messageEl.textContent = defaultHelpText;
    retryBtn.classList.add('hidden');
    try {
      localStorage.removeItem('jsd:rfl');
      localStorage.removeItem('jsd:done:t6');
    } catch (err){}
    resetCup();
    updateProgress();
  }

  retryBtn.addEventListener('click', () => {
    resetState();
  });

  function endAttempt(hit, error){
    state.shotActive = false;
    state.ball = null;
    resetAim();
    if (!Number.isFinite(error) || error < 0){
      error = Infinity;
    }
    const normalizedError = Number.isFinite(error) ? Math.max(0, error) : config.tolerance * 2;
    state.errorCount += 1;
    state.errorSum += normalizedError;
    if (Number.isFinite(error)){
      state.bestError = Math.min(state.bestError, normalizedError);
    }
    if (hit){
      state.hits += 1;
    }
    const remaining = Math.max(0, config.attempts - state.attempt);
    if (hit){
      messageEl.textContent = translate('t6.result_success', { remaining }, `Touché ! ${remaining} essais restants.`);
    } else {
      const distance = Number.isFinite(error) ? Math.round(error) : Math.round(config.tolerance * 2);
      messageEl.textContent = translate('t6.result_miss', { distance }, `Raté de ${distance}px. Ajuste ton tir !`);
    }
    updateProgress();
    if (state.attempt >= config.attempts){
      state.finished = true;
      retryBtn.classList.remove('hidden');
      const finalScore = computeScore();
      messageEl.textContent = translate('t6.final_message', { score: finalScore }, `Terminé · ${finalScore}/100`);
      storeResult();
    }
  }

  function launchShot(angleRad, powerRatio){
    if (state.finished || state.shotActive){
      return false;
    }
    const clampedPower = clamp(Number.isFinite(powerRatio) ? powerRatio : 0, 0, 1);
    if (clampedPower <= 0){
      return false;
    }
    const safeAngle = clamp(Number.isFinite(angleRad) ? angleRad : 0, Math.PI * 0.15, Math.PI / 2);
    state.attempt += 1;
    state.shotActive = true;
    const speed = clampedPower * config.velocityScale * 60;
    const vx = Math.cos(safeAngle) * speed;
    const vy = -Math.sin(safeAngle) * speed;
    state.ball = {
      x: layout.originX,
      y: layout.originY,
      vx,
      vy,
      minError: Infinity,
      hit: false
    };
    messageEl.textContent = translate('t6.shot_launched', null, 'Balle en vol…');
    updateProgress();
    return true;
  }

  function getCanvasPoint(evt){
    const bounds = canvas.getBoundingClientRect();
    if (!bounds || !bounds.width || !bounds.height){
      return { x: layout.originX, y: layout.originY };
    }
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    return {
      x: (evt.clientX - bounds.left) * scaleX,
      y: (evt.clientY - bounds.top) * scaleY
    };
  }

  function updateAimFromPoint(point){
    const originX = layout.originX;
    const originY = layout.originY;
    const rawDx = point.x - originX;
    const rawDy = point.y - originY;
    const dx = Math.min(0, rawDx);
    const dy = Math.max(0, rawDy);
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    const maxDistance = Math.max(layout.width * 0.45, layout.width * 0.2);
    const clampedDistance = clamp(distance, 0, maxDistance);
    let pullNx = 0;
    let pullNy = 0;
    if (distance > 0){
      pullNx = dx / distance;
      pullNy = dy / distance;
    }
    state.aim.x = originX + pullNx * clampedDistance;
    state.aim.y = originY + pullNy * clampedDistance;
    state.aim.distance = clampedDistance;
    const power = maxDistance > 0 ? clampedDistance / maxDistance : 0;
    const shotHorizontal = Math.max(0, -pullNx);
    const shotVertical = Math.max(0, pullNy);
    const angleRad = (shotHorizontal <= 0 && shotVertical <= 0)
      ? 0
      : Math.atan2(shotVertical, Math.max(shotHorizontal, 1e-6));
    state.aim.power = power;
    state.aim.angle = angleRad;
    updateAimDisplay(power, angleRad);
  }

  function endAim(shouldLaunch){
    if (!state.aim.active){
      return;
    }
    const pointerId = state.aim.pointerId;
    if (pointerId !== null && typeof canvas.hasPointerCapture === 'function' && canvas.hasPointerCapture(pointerId) && typeof canvas.releasePointerCapture === 'function'){
      canvas.releasePointerCapture(pointerId);
    }
    state.aim.active = false;
    state.aim.pointerId = null;
    if (shouldLaunch && state.aim.power > 0.05){
      const launched = launchShot(state.aim.angle, state.aim.power);
      if (!launched){
        resetAim();
        if (!state.finished && !state.shotActive){
          messageEl.textContent = defaultHelpText;
        }
      }
    } else {
      resetAim();
      if (!state.finished && !state.shotActive){
        messageEl.textContent = defaultHelpText;
      }
    }
  }

  canvas.addEventListener('pointerdown', (evt) => {
    if (state.finished || state.shotActive){
      return;
    }
    const point = getCanvasPoint(evt);
    const dist = Math.hypot(point.x - layout.originX, point.y - layout.originY);
    if (dist <= layout.ballRadius * 2.4){
      evt.preventDefault();
      state.aim.active = true;
      state.aim.pointerId = evt.pointerId;
      if (typeof canvas.setPointerCapture === 'function'){
        canvas.setPointerCapture(evt.pointerId);
      }
      updateAimFromPoint(point);
      messageEl.textContent = translate('t6.aim_active', null, 'Relâche pour tirer !');
    }
  });

  canvas.addEventListener('pointermove', (evt) => {
    if (!state.aim.active || evt.pointerId !== state.aim.pointerId){
      return;
    }
    evt.preventDefault();
    const point = getCanvasPoint(evt);
    updateAimFromPoint(point);
  });

  const cancelAimEvents = ['pointerup', 'pointercancel', 'pointerout', 'pointerleave'];
  cancelAimEvents.forEach((eventName) => {
    canvas.addEventListener(eventName, (evt) => {
      if (!state.aim.active || evt.pointerId !== state.aim.pointerId){
        return;
      }
      evt.preventDefault();
      const shouldLaunch = eventName === 'pointerup';
      endAim(shouldLaunch);
    });
  });

  function drawCup(){
    ctx.save();
    const x = cup.x;
    const y = cup.y;
    const w = cup.width;
    const h = cup.height;
    const rim = Math.max(2, h * 0.15);
    const poleX = x + w * 0.5;
    const flagHeight = h * 1.4;
    ctx.lineWidth = Math.max(2, layout.width * 0.01);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = 'rgba(30,41,59,0.25)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.12, y + h);
    ctx.lineTo(x + w * 0.88, y + h);
    ctx.lineTo(x + w * 0.72, y + rim);
    ctx.lineTo(x + w * 0.28, y + rim);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.fillRect(x + w * 0.24, y + rim, w * 0.52, h * 0.55);
    ctx.strokeStyle = 'rgba(244,63,94,0.65)';
    ctx.lineWidth = Math.max(2, layout.width * 0.012);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + rim, w * 0.45, rim * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(250, 250, 250, 0.9)';
    ctx.lineWidth = Math.max(2, layout.width * 0.006);
    ctx.beginPath();
    ctx.moveTo(poleX, y + rim);
    ctx.lineTo(poleX, y - flagHeight);
    ctx.stroke();
    const flagWidth = w * 0.42;
    ctx.fillStyle = 'rgba(244,63,94,0.85)';
    ctx.beginPath();
    ctx.moveTo(poleX, y - flagHeight);
    ctx.lineTo(poleX + flagWidth, y - flagHeight + flagWidth * 0.55);
    ctx.lineTo(poleX, y - flagHeight + flagWidth * 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLaunchPad(){
    ctx.save();
    const baseRadius = layout.ballRadius * 2.6;
    const originX = layout.originX;
    const originY = layout.originY;
    const shadowGradient = ctx.createRadialGradient(originX, originY + baseRadius * 0.55, baseRadius * 0.2, originX, originY, baseRadius * 1.05);
    shadowGradient.addColorStop(0, 'rgba(15, 118, 110, 0.35)');
    shadowGradient.addColorStop(1, 'rgba(15, 118, 110, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.arc(originX, originY + baseRadius * 0.4, baseRadius * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(originX, originY, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = Math.max(1.5, layout.width * 0.004);
    ctx.beginPath();
    ctx.arc(originX, originY, baseRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawAimGuide(){
    if (state.shotActive){
      return;
    }
    const originX = layout.originX;
    const originY = layout.originY;
    const power = state.aim.active ? state.aim.power : 0;
    const angle = state.aim.active ? state.aim.angle : Math.PI / 7;
    const spread = Math.PI / 9;
    const baseLength = layout.aimGuideLength * clamp(power, 0, 1);
    const effectiveLength = Math.max(layout.width * 0.18, baseLength);
    ctx.save();
    ctx.translate(originX, originY);
    const leftAngle = angle + spread;
    const rightAngle = angle - spread;
    const leftPoint = {
      x: Math.cos(leftAngle) * effectiveLength,
      y: -Math.sin(leftAngle) * effectiveLength
    };
    const rightPoint = {
      x: Math.cos(rightAngle) * effectiveLength,
      y: -Math.sin(rightAngle) * effectiveLength
    };
    const tipPoint = {
      x: Math.cos(angle) * (effectiveLength + layout.ballRadius * 1.4),
      y: -Math.sin(angle) * (effectiveLength + layout.ballRadius * 1.4)
    };
    const gradient = ctx.createLinearGradient(0, 0, tipPoint.x, tipPoint.y);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
    gradient.addColorStop(0.25, 'rgba(59, 130, 246, 0.25)');
    gradient.addColorStop(0.6, 'rgba(56, 189, 248, 0.35)');
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0.7)');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(leftPoint.x, leftPoint.y);
    ctx.lineTo(tipPoint.x, tipPoint.y);
    ctx.lineTo(rightPoint.x, rightPoint.y);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, layout.width * 0.003);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.stroke();
    const arrowLength = Math.max(layout.ballRadius * 3, effectiveLength * 0.25);
    const arrowTail = {
      x: Math.cos(angle) * (effectiveLength - arrowLength * 0.4),
      y: -Math.sin(angle) * (effectiveLength - arrowLength * 0.4)
    };
    const arrowTip = {
      x: Math.cos(angle) * (effectiveLength + arrowLength * 0.6),
      y: -Math.sin(angle) * (effectiveLength + arrowLength * 0.6)
    };
    const headLeft = {
      x: arrowTip.x + Math.cos(angle + Math.PI * 0.75) * arrowLength * 0.25,
      y: arrowTip.y - Math.sin(angle + Math.PI * 0.75) * arrowLength * 0.25
    };
    const headRight = {
      x: arrowTip.x + Math.cos(angle - Math.PI * 0.75) * arrowLength * 0.25,
      y: arrowTip.y - Math.sin(angle - Math.PI * 0.75) * arrowLength * 0.25
    };
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = Math.max(3, layout.ballRadius * 0.8);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(arrowTail.x, arrowTail.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
    ctx.beginPath();
    ctx.moveTo(arrowTip.x, arrowTip.y);
    ctx.lineTo(headLeft.x, headLeft.y);
    ctx.lineTo(headRight.x, headRight.y);
    ctx.closePath();
    ctx.fill();
    if (!state.aim.active){
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, layout.ballRadius * 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = layout.ballRadius * 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPullHandle(){
    if (!state.aim.active || state.shotActive){
      return;
    }
    ctx.save();
    ctx.fillStyle = 'rgba(15, 118, 110, 0.12)';
    ctx.beginPath();
    ctx.arc(state.aim.x, state.aim.y, layout.ballRadius * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBall(ball){
    const radius = layout.ballRadius;
    let x = layout.originX;
    let y = layout.originY;
    if (ball){
      x = ball.x;
      y = ball.y;
    }
    ctx.save();
    const shadowGradient = ctx.createRadialGradient(x, y + radius * 0.9, radius * 0.2, x, y + radius * 0.9, radius * 1.6);
    shadowGradient.addColorStop(0, 'rgba(15, 23, 42, 0.28)');
    shadowGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.arc(x, y + radius * 0.9, radius * 1.4, 0, Math.PI * 2);
    ctx.fill();
    const gradient = ctx.createRadialGradient(x - radius * 0.4, y - radius * 0.8, radius * 0.2, x, y, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.55, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (!ball && state.aim.active && !state.shotActive){
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
    ctx.lineWidth = radius * 0.22;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.55, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  function renderBackground(){
    const skyGradient = ctx.createLinearGradient(0, 0, 0, layout.height);
    skyGradient.addColorStop(0, 'rgba(191, 219, 254, 1)');
    skyGradient.addColorStop(0.5, 'rgba(224, 242, 254, 0.95)');
    skyGradient.addColorStop(1, 'rgba(187, 247, 208, 0.85)');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, layout.width, layout.height);
    const hillGradient = ctx.createLinearGradient(0, layout.originY * 0.1, 0, layout.height);
    hillGradient.addColorStop(0, 'rgba(110, 231, 183, 0.65)');
    hillGradient.addColorStop(1, 'rgba(16, 185, 129, 0.9)');
    ctx.fillStyle = hillGradient;
    ctx.beginPath();
    ctx.moveTo(0, layout.originY - layout.ballRadius * 4);
    ctx.quadraticCurveTo(layout.width * 0.4, layout.originY - layout.ballRadius * 7, layout.width, layout.originY - layout.ballRadius * 3);
    ctx.lineTo(layout.width, layout.height);
    ctx.lineTo(0, layout.height);
    ctx.closePath();
    ctx.fill();
    const teeTop = layout.originY + layout.ballRadius * 0.4;
    const groundGradient = ctx.createLinearGradient(0, teeTop, 0, layout.height);
    groundGradient.addColorStop(0, 'rgba(13, 148, 136, 0.95)');
    groundGradient.addColorStop(1, 'rgba(6, 95, 70, 1)');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, teeTop, layout.width, layout.height - teeTop);
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#064e3b';
    const stripeHeight = Math.max(6, layout.height * 0.06);
    for (let i = 0; i < 10; i += 1){
      const stripeY = teeTop + i * stripeHeight * 1.4;
      ctx.fillRect(0, stripeY, layout.width, stripeHeight);
    }
    ctx.restore();
  }

  function updateCup(dt){
    cup.x += cup.vx * dt;
    if (cup.x < layout.padding){
      cup.x = layout.padding;
      cup.vx = Math.abs(cup.vx);
    } else if (cup.x + cup.width > layout.width - layout.padding){
      cup.x = layout.width - layout.padding - cup.width;
      cup.vx = -Math.abs(cup.vx);
    }
  }

  function updateBall(dt){
    if (!state.ball){
      return;
    }
    const ball = state.ball;
    ball.vy += config.gravity * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    const cupTop = cup.y;
    const cupBottom = cup.y + cup.height;
    const cupCenter = cup.x + cup.width / 2;
    const catchRadius = (cup.width * 0.45);
    if (ball.y >= cupTop - layout.ballRadius && ball.y <= cupBottom + layout.ballRadius){
      const error = Math.abs(ball.x - cupCenter);
      if (Number.isFinite(error)){
        ball.minError = Math.min(ball.minError, error);
      }
      if (!ball.hit && ball.vy > 0 && ball.y >= cupTop && ball.y <= cupBottom && error <= catchRadius){
        ball.hit = true;
        endAttempt(true, error);
        return;
      }
    }
    if (ball.y > layout.height + 80 || ball.x < -80 || ball.x > layout.width + 80){
      const error = Number.isFinite(ball.minError) ? ball.minError : Infinity;
      endAttempt(false, error);
    }
  }

  function loop(now){
    const dtMs = now - state.lastTime;
    state.lastTime = now;
    const dt = clamp(dtMs / 1000, 0.005, 0.04);
    updateCup(dt);
    updateBall(dt);
    ctx.clearRect(0, 0, layout.width, layout.height);
    renderBackground();
    drawCup();
    drawLaunchPad();
    drawAimGuide();
    drawPullHandle();
    drawBall(state.ball);
    state.rafId = requestAnimationFrame(loop);
  }

  resize();
  updateProgress();
  resetCup();
  window.addEventListener('resize', () => {
    resize();
    updateProgress();
  });

  state.lastTime = performance.now();
  state.rafId = requestAnimationFrame(loop);

  restoreResult();
})();
