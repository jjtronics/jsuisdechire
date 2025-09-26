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

  const messageEl = el('div', 'text-sm text-slate-600 dark:text-slate-300', translate('t6.help', null, 'Suis la trajectoire, ajuste tes sliders puis tire ta balle.'));

  const canvasWrap = el('div', 'relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-b from-amber-100/70 to-rose-100/60 shadow-inner dark:from-slate-900/70 dark:to-rose-900/20');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvasWrap.append(canvas);

  const controls = el('div', 'grid gap-4 sm:grid-cols-2');

  function slider(options){
    const wrapper = el('label', 'flex flex-col gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200');
    const title = el('span', '', translate(options.label, null, options.fallbackLabel));
    const track = el('div', 'flex items-center gap-3');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(options.min);
    input.max = String(options.max);
    input.step = String(options.step || 1);
    input.value = String(options.value);
    input.className = 'flex-1 accent-rose-600';
    const value = el('span', 'font-black text-base text-rose-600 dark:text-rose-300');
    track.append(input, value);
    wrapper.append(title, track);
    return { wrapper, input, value, title };
  }

  const angleControl = slider({
    label: 't6.angle_label',
    fallbackLabel: 'Angle',
    min: 25,
    max: 75,
    value: 45
  });
  const powerControl = slider({
    label: 't6.power_label',
    fallbackLabel: 'Puissance',
    min: 35,
    max: 100,
    value: 70
  });
  controls.append(angleControl.wrapper, powerControl.wrapper);

  const buttonsRow = el('div', 'flex flex-wrap items-center gap-3');
  const fireBtn = el('button', 'px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold shadow hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition', translate('t6.fire_button', null, 'Tirer'));
  fireBtn.type = 'button';
  const retryBtn = el('button', 'px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900/40 hidden', translate('t6.button_retry', null, 'Rejouer'));
  retryBtn.type = 'button';
  buttonsRow.append(fireBtn, retryBtn);

  root.append(statsBar, messageEl, canvasWrap, controls, buttonsRow);

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
    ball: null
  };

  const layout = {
    width: 360,
    height: 440,
    padding: 16,
    cupWidth: 80,
    cupHeight: 54,
    ballRadius: 8,
    groundOffset: 36,
    originX: 60,
    originY: 0
  };

  const cup = {
    x: 0,
    y: 120,
    width: layout.cupWidth,
    height: layout.cupHeight,
    vx: 90
  };

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
    resetCup();
    canvas.width = layout.width;
    canvas.height = layout.height;
  }

  function setSliderValues(){
    angleControl.value.textContent = `${Math.round(Number(angleControl.input.value))}°`;
    powerControl.value.textContent = `${Math.round(Number(powerControl.input.value))}%`;
  }

  setSliderValues();

  angleControl.input.addEventListener('input', setSliderValues);
  powerControl.input.addEventListener('input', setSliderValues);

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
      fireBtn.disabled = true;
      retryBtn.classList.remove('hidden');
      state.shotActive = false;
      state.ball = null;
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
    messageEl.textContent = translate('t6.help', null, 'Suis la trajectoire, ajuste tes sliders puis tire ta balle.');
    fireBtn.disabled = false;
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
      messageEl.textContent = translate('t6.result_miss', { distance }, `Raté de ${distance}px. Ajuste tes sliders !`);
    }
    updateProgress();
    if (state.attempt >= config.attempts){
      state.finished = true;
      fireBtn.disabled = true;
      retryBtn.classList.remove('hidden');
      const finalScore = computeScore();
      messageEl.textContent = translate('t6.final_message', { score: finalScore }, `Terminé · ${finalScore}/100`);
      storeResult();
    } else {
      fireBtn.disabled = false;
    }
  }

  function fire(){
    if (state.finished || state.shotActive){
      return;
    }
    state.attempt += 1;
    state.shotActive = true;
    fireBtn.disabled = true;
    const angleDeg = Number(angleControl.input.value);
    const power = Number(powerControl.input.value) / 100;
    const angleRad = angleDeg * Math.PI / 180;
    const speed = power * config.velocityScale * 60;
    const vx = Math.cos(angleRad) * speed;
    const vy = -Math.sin(angleRad) * speed;
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
  }

  fireBtn.addEventListener('click', fire);

  function drawCup(){
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)';
    ctx.lineWidth = Math.max(2, layout.width * 0.012);
    const x = cup.x;
    const y = cup.y;
    const w = cup.width;
    const h = cup.height;
    const lip = h * 0.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(253, 186, 116, 0.8)';
    ctx.fillRect(x + w * 0.18, y + lip, w * 0.64, h * 0.6);
    ctx.restore();
  }

  function drawBall(ball){
    if (!ball){
      return;
    }
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(244, 63, 94, 0.3)';
    ctx.shadowBlur = layout.ballRadius * 0.6;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, layout.ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLauncher(){
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
    ctx.lineWidth = layout.ballRadius * 0.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(layout.originX - layout.ballRadius * 1.5, layout.originY + layout.ballRadius);
    ctx.lineTo(layout.originX + layout.ballRadius * 1.5, layout.originY + layout.ballRadius);
    ctx.stroke();
    ctx.restore();
  }

  function renderBackground(){
    const gradient = ctx.createLinearGradient(0, 0, 0, layout.height);
    gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, layout.originY + layout.ballRadius, layout.width, layout.height - layout.originY);
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
    drawLauncher();
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
