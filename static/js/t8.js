(function () {
  const flow = window.jsdFlow;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t8')) return;
  const root = document.getElementById('t8');
  if (!root) return;
  const t = (key, params, fallback) => {
    const value = typeof window.i18n === 'function' ? window.i18n(key, params || {}) : key;
    return value !== key ? value : (fallback || key);
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const num = (value, fallback) => {
    const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const settings = (window.jsdConfig && window.jsdConfig.settings) || {};
  const config = {
    attempts: clamp(Math.round(num(settings.pong_attempts, 5)), 1, 20),
    gravity: clamp(num(settings.pong_gravity, 1800), 400, 4000),
    velocity: clamp(num(settings.pong_velocity_scale, 4.8), .8, 20),
    cupSpeed: clamp(num(settings.pong_cup_speed, 160), 30, 500),
    tolerance: clamp(num(settings.pong_accuracy_tolerance_px, 60), 10, 130),
  };
  const style = document.createElement('style');
  style.textContent = `#t8 .t8-game{display:grid;gap:1rem}#t8 .t8-hud{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.6rem}#t8 .t8-stat{padding:.7rem;border:1px solid #bbf7d0;border-radius:1rem;background:#f0fdf4;text-align:center}#t8 .t8-stat span{display:block}#t8 .t8-stat-label{color:#64748b;font-size:.65rem;font-weight:900;text-transform:uppercase}#t8 .t8-stat-value{margin-top:.15rem;color:#14532d;font-size:1.2rem;font-weight:950}#t8 .t8-stage{position:relative;min-height:22rem;overflow:hidden;border:5px solid #7c2d12;border-radius:1.8rem;background:radial-gradient(circle at 20% 16%,#fef3c7 0 .18rem,transparent .21rem),linear-gradient(175deg,#0f766e,#047857 55%,#064e3b);touch-action:none;cursor:crosshair}#t8 .t8-stage:before{content:'';position:absolute;left:8%;right:8%;top:12%;height:58%;border:2px dashed rgba(253,230,138,.34);border-radius:50%;pointer-events:none}.t8-cup{position:absolute;z-index:4;top:4.05rem;width:6.2rem;height:7.8rem;transform:translateX(-50%);pointer-events:none}.t8-cup-body{position:absolute;left:50%;top:1.1rem;width:78%;height:5.5rem;clip-path:polygon(6% 0,94% 0,77% 100%,23% 100%);transform:translateX(-50%);border:3px solid #fff7ed;background:linear-gradient(145deg,#fb7185,#e11d48 58%,#9f1239)}.t8-cup-rim{position:absolute;left:50%;top:.45rem;width:82%;height:1.75rem;border:4px solid #fff7ed;border-radius:50%;background:#fb7185;box-shadow:0 .28rem 0 #881337;transform:translateX(-50%)}.t8-cup-rim:after{content:'';position:absolute;left:11%;right:11%;top:18%;height:58%;border-radius:50%;background:#4c0519}.t8-cup.is-hit{filter:drop-shadow(0 0 14px #fde68a)}.t8-hit-zone{position:absolute;z-index:2;border:2px dashed rgba(254,240,138,.86);border-radius:50%;background:rgba(254,240,138,.08);box-shadow:0 0 0 .45rem rgba(254,240,138,.07),0 0 1.2rem rgba(253,230,138,.25);pointer-events:none;transform:translate(-50%,-50%)}.t8-ball{position:absolute;z-index:5;width:1.55rem;height:1.55rem;border:3px solid #fff;border-radius:50%;background:radial-gradient(circle at 33% 25%,#fff 0 14%,#fde68a 15% 44%,#f59e0b 45% 72%,#b45309 73%);box-shadow:0 0 0 .35rem rgba(253,230,138,.18),0 8px 18px rgba(0,0,0,.4);transform:translate(-50%,-50%)}.t8-guide{position:absolute;z-index:3;width:4rem;height:3px;border-radius:999px;background:linear-gradient(90deg,#fde68a,#fff);transform-origin:0 50%;pointer-events:none}.t8-instruction{padding:.75rem 1rem;border:1px solid #a7f3d0;border-radius:1rem;background:#f0fdf4;color:#14532d;text-align:center;font-size:.85rem;font-weight:800}.t8-power-head{display:flex;justify-content:space-between;color:#475569;font-size:.75rem;font-weight:900}.t8-meter{height:.62rem;overflow:hidden;border-radius:999px;background:#e2e8f0}.t8-meter-fill{width:0;height:100%;background:linear-gradient(90deg,#22c55e,#facc15 55%,#f97316);transition:width .08s ease}`;
  document.head.appendChild(style);
  const launcherStyle = document.createElement('style');
  launcherStyle.textContent = `#t8 .t8-launch-pad{position:absolute;z-index:4;width:5rem;height:5rem;border:2px dashed rgba(254,240,138,.78);border-radius:50%;background:rgba(254,240,138,.08);box-shadow:0 0 0 .45rem rgba(254,240,138,.07),inset 0 0 1.2rem rgba(254,240,138,.08);transform:translate(-50%,-50%);pointer-events:none;transition:border-color .12s ease,background .12s ease,box-shadow .12s ease}#t8 .t8-launch-pad:before{content:'';position:absolute;inset:11px;border:1px solid rgba(255,255,255,.42);border-radius:50%}#t8 .t8-launch-pad.is-active{border-color:#fff;background:rgba(254,240,138,.16);box-shadow:0 0 0 .55rem rgba(254,240,138,.13),0 0 1.5rem rgba(254,240,138,.38),inset 0 0 1.2rem rgba(254,240,138,.12)}#t8 .t8-launch-label{position:absolute;z-index:6;color:rgba(254,240,138,.82);font-size:.52rem;font-weight:950;letter-spacing:.16em;line-height:1;pointer-events:none;transform:translate(-50%,2.8rem);white-space:nowrap}`;
  document.head.appendChild(launcherStyle);
  const el = (tag, classes, text) => { const node = document.createElement(tag); node.className = classes || ''; if (text !== undefined) node.textContent = text; return node; };
  const game = el('div', 't8-game');
  const hud = el('div', 't8-hud');
  const stat = (label) => { const box = el('div', 't8-stat'); const value = el('span', 't8-stat-value', '0'); box.append(el('span', 't8-stat-label', label), value); hud.append(box); return value; };
  const rounds = stat(t('t8.stat_progress', null, 'Tir'));
  const hits = stat(t('t8.stat_hits', null, 'Buts'));
  const score = stat(t('t8.stat_score', null, 'Score'));
  const stage = el('div', 't8-stage');
  const hitZone = el('div', 't8-hit-zone');
  const cup = el('div', 't8-cup'); cup.append(el('div', 't8-cup-body'), el('div', 't8-cup-rim'));
  const guide = el('div', 't8-guide');
  const ball = el('div', 't8-ball');
  const launchPad = el('div', 't8-launch-pad');
  const launchLabel = el('div', 't8-launch-label', 'TIRE ICI');
  stage.append(hitZone, cup, guide, launchPad, ball, launchLabel);
  const instruction = el('div', 't8-instruction', 'Tire le grand cercle en arrière, puis relâche : la balle part dans l’autre sens.');
  const power = el('div', 't8-power'); const powerHead = el('div', 't8-power-head'); const powerValue = el('span', '', '0%'); const meter = el('div', 't8-meter'); const meterFill = el('div', 't8-meter-fill'); powerHead.append(el('span', '', t('t8.power', null, 'Puissance')), powerValue); meter.append(meterFill); power.append(powerHead, meter);
  game.append(hud, stage, instruction, power); root.replaceChildren(game);
  const state = { phase: 'ready', attempt: 0, hits: 0, last: performance.now(), ball: null, aim: null, cup: { x: 0, y: 0, width: 0, vx: config.cupSpeed } };
  const point = (event) => { const rect = stage.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const updateStats = () => { rounds.textContent = `${state.attempt}/${config.attempts}`; hits.textContent = `${state.hits}/${config.attempts}`; score.textContent = `${Math.round(state.hits / config.attempts * 100)}/100`; };
  const updateCup = () => { const center = state.cup.x + state.cup.width / 2; cup.style.left = `${center}px`; hitZone.style.left = `${center}px`; hitZone.style.top = `${state.cup.y + 13}px`; hitZone.style.width = `${config.tolerance * 2}px`; hitZone.style.height = `${config.tolerance * 2}px`; };
  const layout = () => { const width = Math.max(280, stage.clientWidth || 360); const height = Math.max(280, stage.clientHeight || 352); const startY = height - 83; state.cup.width = clamp(width * .16, 84, 120); state.cup.y = cup.offsetTop + 5; state.cup.x = clamp(state.cup.x || width / 2 - state.cup.width / 2, 12, width - state.cup.width - 12); ball.style.left = '50%'; ball.style.top = `${startY}px`; launchPad.style.left = '50%'; launchPad.style.top = `${startY}px`; launchLabel.style.left = '50%'; launchLabel.style.top = `${startY}px`; if (state.phase === 'ready') { guide.style.left = '50%'; guide.style.top = `${startY}px`; guide.style.width = '70px'; guide.style.transform = 'rotate(-65deg)'; guide.style.opacity = '1'; } updateCup(); };
  const setAim = (pulled) => { const ballRect = ball.getBoundingClientRect(); const stageRect = stage.getBoundingClientRect(); const start = { x: ballRect.left + ballRect.width / 2 - stageRect.left, y: ballRect.top + ballRect.height / 2 - stageRect.top }; const dx = start.x - pulled.x; const dy = Math.min(-24, start.y - pulled.y); const distance = Math.hypot(dx, dy); state.aim = { start, dx, dy, distance }; const percent = Math.round(clamp(distance / Math.max(90, stage.clientHeight * .38), .08, 1) * 100); powerValue.textContent = `${percent}%`; meterFill.style.width = `${percent}%`; guide.style.left = `${start.x}px`; guide.style.top = `${start.y}px`; guide.style.width = `${Math.max(52, Math.min(160, distance))}px`; guide.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`; };
  const finish = (hit) => { state.ball = null; state.phase = 'ready'; cup.classList.toggle('is-hit', hit); setTimeout(() => cup.classList.remove('is-hit'), 280); if (hit) state.hits += 1; updateStats(); if (state.attempt >= config.attempts) { state.phase = 'complete'; localStorage.setItem('jsd:pong', JSON.stringify({ score: Math.round(state.hits / config.attempts * 100), hits: state.hits, attempts: config.attempts })); localStorage.setItem('jsd:done:t8', '1'); } };
  const launch = () => { if (!state.aim) return; const { start, dx, dy, distance } = state.aim; const power = clamp(distance / Math.max(90, stage.clientHeight * .38), .08, 1); const speed = power * config.velocity * 300; state.ball = { x: start.x, y: start.y, vx: dx / distance * speed, vy: dy / distance * speed }; state.attempt += 1; state.phase = 'flying'; launchPad.classList.remove('is-active'); guide.style.opacity = '0'; updateStats(); };
  stage.addEventListener('pointerdown', (event) => { if (state.phase !== 'ready') return; const p = point(event); const ballRect = ball.getBoundingClientRect(); const stageRect = stage.getBoundingClientRect(); const start = { x: ballRect.left + ballRect.width / 2 - stageRect.left, y: ballRect.top + ballRect.height / 2 - stageRect.top }; if (Math.hypot(p.x - start.x, p.y - start.y) > 50) return; event.preventDefault(); stage.setPointerCapture?.(event.pointerId); state.phase = 'aiming'; launchPad.classList.add('is-active'); setAim(p); });
  stage.addEventListener('pointermove', (event) => { if (state.phase === 'aiming') { event.preventDefault(); setAim(point(event)); } });
  stage.addEventListener('pointerup', (event) => { if (state.phase === 'aiming') { event.preventDefault(); launch(); } });
  stage.addEventListener('pointercancel', () => { if (state.phase === 'aiming') { state.phase = 'ready'; launchPad.classList.remove('is-active'); layout(); } });
  window.addEventListener('resize', layout); layout(); updateStats();
  const loop = (now) => { const dt = clamp((now - state.last) / 1000, .005, .04); state.last = now; if (state.phase !== 'complete') { const width = Math.max(280, stage.clientWidth || 360); state.cup.x += state.cup.vx * dt; if (state.cup.x <= 12 || state.cup.x + state.cup.width >= width - 12) state.cup.vx *= -1; state.cup.x = clamp(state.cup.x, 12, width - state.cup.width - 12); updateCup(); } if (state.ball) { const previousY = state.ball.y; state.ball.vy += config.gravity * dt; state.ball.x += state.ball.vx * dt; state.ball.y += state.ball.vy * dt; ball.style.left = `${state.ball.x}px`; ball.style.top = `${state.ball.y}px`; const rimY = state.cup.y + 13; if (state.ball.vy > 0 && previousY <= rimY && state.ball.y >= rimY) { const ratio = (rimY - previousY) / Math.max(.01, state.ball.y - previousY); const crossX = state.ball.x - state.ball.vx * dt * (1 - ratio); if (Math.abs(crossX - (state.cup.x + state.cup.width / 2)) <= config.tolerance) finish(true); } if (state.ball && (state.ball.y > stage.clientHeight + 60 || state.ball.x < -60 || state.ball.x > stage.clientWidth + 60)) finish(false); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();
