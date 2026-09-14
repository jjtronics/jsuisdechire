(function(){
  const flow = window.jsdFlow || null;
  if (flow && typeof flow.isActive === 'function' && !flow.isActive('t5')){
    return;
  }

  const box = document.getElementById('t5');
  if (!box){
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

  const BRANDS = [
    { key:'heineken', label:'Heineken', color:'#1d7a34', text:'#f2f5f0' },
    { key:'guinness', label:'Guinness', color:'#1a1919', text:'#f2c94c' },
    { key:'pelforth', label:'Pelforth', color:'#9f1b28', text:'#f9d46c' },
    { key:'grimbergen', label:'Grimbergen', color:'#6c4024', text:'#f1d6a8' },
    { key:'stella', label:'Stella Artois', color:'#d6c3a0', text:'#872b2b' },
    { key:'kronenbourg', label:'Kronenbourg', color:'#d72638', text:'#ffffff' },
    { key:'duvel', label:'Duvel', color:'#f3f3f3', text:'#c81d25' },
    { key:'lagunitas', label:'Lagunitas', color:'#f1efe7', text:'#1f1b16' },
    { key:'peroni', label:'Peroni', color:'#214478', text:'#f0f6ff' },
    { key:'1664', label:'1664', color:'#0e2345', text:'#ffffff' },
    { key:'brooklyn', label:'Brooklyn', color:'#065c3b', text:'#f7f5e6' },
    { key:'punkipa', label:'Punk IPA', color:'#00a3ad', text:'#102027' }
  ];

  function shuffle(list){
    for(let i=list.length-1;i>0;i-=1){
      const j=Math.floor(Math.random()*(i+1));
      [list[i],list[j]]=[list[j],list[i]];
    }
    return list;
  }

  function parseNumber(value, fallback){
    if(value == null){
      return fallback;
    }
    const num = Number.parseFloat(String(value).replace(',','.'));
    return Number.isFinite(num) ? num : fallback;
  }

  function clamp(num, min, max){
    return Math.max(min, Math.min(max, num));
  }

  function defaults(raw){
    const maxPairs = Math.min(12, BRANDS.length);
    const pairs = Math.round(clamp(parseNumber(raw.mem_pairs, 8), 2, maxPairs));
    const reveal = Math.round(clamp(parseNumber(raw.mem_initial_reveal_ms, 1500), 300, 5000));
    const hide = Math.round(clamp(parseNumber(raw.mem_mismatch_hide_ms, 900), 150, 4000));
    let accWeight = parseNumber(raw.mem_accuracy_weight, 0.6);
    let speedWeight = parseNumber(raw.mem_speed_weight, 0.4);
    if(!Number.isFinite(accWeight) || accWeight < 0){ accWeight = 0.6; }
    if(!Number.isFinite(speedWeight) || speedWeight < 0){ speedWeight = 0.4; }
    const best = Math.max(5000, Math.round(parseNumber(raw.mem_time_best_ms, 45000)));
    const worst = Math.max(best + 1000, Math.round(parseNumber(raw.mem_time_worst_ms, 120000)));
    return { pairs, reveal, hide, accWeight, speedWeight, best, worst };
  }

  let config = defaults({});

  async function loadSettings(){
    try {
      const response = await fetch('/api/settings', { cache: 'no-store' });
      if(response.ok){
        config = defaults(await response.json() || {});
        updateOverview();
        updateStats();
      }
    } catch(err){
      /* Keep the local defaults when settings are unavailable. */
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    #t5 .t5-wrapper{display:flex;flex-direction:column;gap:1rem;}
    #t5 .t5-overview{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.65rem;}
    #t5 .t5-overview-item{display:flex;align-items:center;gap:0.6rem;padding:0.75rem 0.85rem;border:1px solid rgba(244,63,94,0.16);border-radius:18px;background:linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,247,237,0.9));color:#881337;}
    #t5 .t5-overview-icon{display:grid;place-items:center;width:2rem;height:2rem;border-radius:12px;background:rgba(255,255,255,0.78);font-size:1rem;box-shadow:0 5px 12px -8px rgba(190,24,93,0.8);}
    #t5 .t5-overview-label{display:block;font-size:0.68rem;font-weight:900;letter-spacing:0.04em;text-transform:uppercase;opacity:0.7;}
    #t5 .t5-overview-value{display:block;font-size:0.88rem;font-weight:900;}
    html.dark #t5 .t5-overview-item{border-color:rgba(251,113,133,0.25);background:linear-gradient(135deg,rgba(136,19,55,0.2),rgba(154,52,18,0.18));color:#fecdd3;}
    html.dark #t5 .t5-overview-icon{background:rgba(15,23,42,0.64);}
    #t5 .t5-hud{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.55rem;}
    #t5 .t5-stat{padding:0.7rem 0.45rem;border:1px solid rgba(148,163,184,0.22);border-radius:16px;background:rgba(248,250,252,0.92);text-align:center;}
    #t5 .t5-stat-label{display:block;color:#64748b;font-size:0.68rem;font-weight:900;letter-spacing:0.05em;text-transform:uppercase;}
    #t5 .t5-stat-value{display:block;margin-top:0.12rem;color:#1e293b;font-size:1.05rem;font-weight:950;}
    #t5 .t5-stat:first-child{border-color:rgba(16,185,129,0.28);background:rgba(236,253,245,0.9);}
    #t5 .t5-stat:first-child .t5-stat-value{color:#047857;}
    #t5 .t5-stat:nth-child(2){border-color:rgba(251,146,60,0.28);background:rgba(255,247,237,0.92);}
    #t5 .t5-stat:nth-child(2) .t5-stat-value{color:#c2410c;}
    #t5 .t5-stat:nth-child(3){border-color:rgba(96,165,250,0.28);background:rgba(239,246,255,0.92);}
    #t5 .t5-stat:nth-child(3) .t5-stat-value{color:#1d4ed8;}
    html.dark #t5 .t5-stat{border-color:rgba(148,163,184,0.3);background:rgba(15,23,42,0.72);}
    html.dark #t5 .t5-stat-label{color:#cbd5e1;}
    html.dark #t5 .t5-stat-value{color:#f8fafc;}
    html.dark #t5 .t5-stat:first-child{background:rgba(6,78,59,0.28);}
    html.dark #t5 .t5-stat:first-child .t5-stat-value{color:#a7f3d0;}
    html.dark #t5 .t5-stat:nth-child(2){background:rgba(154,52,18,0.22);}
    html.dark #t5 .t5-stat:nth-child(2) .t5-stat-value{color:#fed7aa;}
    html.dark #t5 .t5-stat:nth-child(3){background:rgba(30,64,175,0.22);}
    html.dark #t5 .t5-stat:nth-child(3) .t5-stat-value{color:#bfdbfe;}
    #t5 .t5-progress-wrap{display:flex;flex-direction:column;gap:0.45rem;}
    #t5 .t5-progress-line{display:flex;justify-content:space-between;gap:0.75rem;color:#64748b;font-size:0.78rem;font-weight:900;}
    html.dark #t5 .t5-progress-line{color:#cbd5e1;}
    #t5 .t5-progress-track{height:0.62rem;overflow:hidden;border-radius:9999px;background:#ffe4e6;box-shadow:inset 0 1px 3px rgba(136,19,55,0.12);}
    #t5 .t5-progress-fill{width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,#fb7185,#f97316);transition:width 350ms ease;}
    html.dark #t5 .t5-progress-track{background:rgba(136,19,55,0.38);}
    #t5 .t5-board-shell{position:relative;min-height:13rem;padding:0.8rem;border:1px solid rgba(244,63,94,0.16);border-radius:26px;background:radial-gradient(circle at 50% 0%,rgba(255,255,255,0.92),rgba(255,241,242,0.72) 62%,rgba(254,215,170,0.5));box-shadow:inset 0 1px 0 rgba(255,255,255,0.8),0 22px 44px -30px rgba(190,24,93,0.7);}
    html.dark #t5 .t5-board-shell{border-color:rgba(251,113,133,0.22);background:radial-gradient(circle at 50% 0%,rgba(51,65,85,0.72),rgba(30,41,59,0.8) 62%,rgba(67,20,36,0.7));box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 22px 44px -30px rgba(15,23,42,0.9);}
    #t5 .t5-empty{display:grid;place-items:center;min-height:12rem;padding:1.5rem;text-align:center;color:#9f1239;font-size:1rem;font-weight:900;}
    #t5 .t5-empty.is-hidden,#t5 .t5-start-wrap.is-hidden{display:none;}
    #t5 .t5-empty-icon{display:block;margin-bottom:0.45rem;font-size:2.5rem;filter:drop-shadow(0 8px 6px rgba(190,24,93,0.18));}
    html.dark #t5 .t5-empty{color:#fecdd3;}
    #t5 .t5-grid{display:grid;gap:0.62rem;transition:opacity 200ms ease;}
    #t5 .t5-grid.is-hidden{display:none;}
    #t5 .t5-card{position:relative;min-width:0;padding:0;border:0;background:transparent;aspect-ratio:1;perspective:900px;cursor:pointer;touch-action:manipulation;}
    #t5 .t5-card:focus-visible{outline:3px solid #fb7185;outline-offset:4px;border-radius:50%;}
    #t5 .t5-card-inner{position:relative;display:block;width:100%;height:100%;transform-style:preserve-3d;transition:transform 420ms cubic-bezier(.2,.75,.25,1);}
    #t5 .t5-card.is-revealed .t5-card-inner,#t5 .t5-card.is-matched .t5-card-inner{transform:rotateY(180deg);}
    #t5 .t5-card-face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;backface-visibility:hidden;-webkit-backface-visibility:hidden;}
    #t5 .t5-card-back{border:5px solid rgba(255,255,255,0.92);background:radial-gradient(circle at 32% 25%,#fb7185 0 8%,transparent 9%),radial-gradient(circle at 74% 70%,#f97316 0 7%,transparent 8%),linear-gradient(135deg,#be123c,#9f1239 55%,#7f1d1d);box-shadow:inset 0 0 0 2px rgba(255,255,255,0.22),0 10px 18px -12px rgba(136,19,55,0.9);}
    #t5 .t5-card-back::after{content:'✦';display:grid;place-items:center;width:43%;height:43%;border:2px solid rgba(255,255,255,0.72);border-radius:50%;color:#fff;font-size:1.15rem;box-shadow:0 0 0 5px rgba(255,255,255,0.1);}
    #t5 .t5-card-front{transform:rotateY(180deg);flex-direction:column;gap:0.18rem;padding:0.35rem;border:5px solid rgba(255,255,255,0.86);background:var(--brand-color);color:var(--brand-text);box-shadow:inset 0 0 0 2px rgba(15,23,42,0.14),0 10px 18px -12px rgba(15,23,42,0.65);}
    #t5 .t5-brand-dot{display:block;width:25%;aspect-ratio:1;border:2px solid currentColor;border-radius:50%;opacity:0.72;}
    #t5 .t5-brand-label{max-width:92%;overflow:hidden;font-size:clamp(0.52rem,2.6vw,0.78rem);font-weight:950;line-height:1.05;text-overflow:ellipsis;white-space:nowrap;}
    #t5 .t5-coaster-mark{font-size:0.65rem;line-height:1;opacity:0.72;}
    #t5 .t5-card.is-matched .t5-card-front{border-color:#34d399;box-shadow:inset 0 0 0 3px rgba(255,255,255,0.3),0 0 0 4px rgba(52,211,153,0.2),0 12px 20px -12px rgba(5,150,105,0.8);animation:t5-match-pop 420ms ease both;}
    #t5 .t5-card.is-wrong .t5-card-inner{animation:t5-wrong-shake 360ms ease both;}
    #t5 .t5-card:disabled{cursor:default;}
    #t5 .t5-message{min-height:2.85rem;display:grid;place-items:center;padding:0.75rem 1rem;border:1px solid rgba(244,63,94,0.2);border-radius:16px;background:rgba(255,241,242,0.86);color:#9f1239;text-align:center;font-size:0.88rem;font-weight:850;}
    #t5 .t5-message[data-tone='success']{border-color:rgba(16,185,129,0.28);background:rgba(236,253,245,0.9);color:#047857;}
    #t5 .t5-message[data-tone='warning']{border-color:rgba(251,146,60,0.3);background:rgba(255,247,237,0.92);color:#c2410c;}
    html.dark #t5 .t5-message{border-color:rgba(251,113,133,0.28);background:rgba(136,19,55,0.2);color:#fecdd3;}
    html.dark #t5 .t5-message[data-tone='success']{border-color:rgba(52,211,153,0.3);background:rgba(6,78,59,0.28);color:#a7f3d0;}
    html.dark #t5 .t5-message[data-tone='warning']{border-color:rgba(251,146,60,0.32);background:rgba(154,52,18,0.22);color:#fed7aa;}
    #t5 .t5-start-wrap{display:flex;justify-content:center;}
    #t5 .t5-start{min-height:3.25rem;min-width:13rem;padding:0.75rem 1.2rem;border:1px solid rgba(244,63,94,0.28);border-radius:16px;background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff;font-size:1rem;font-weight:950;box-shadow:0 16px 28px -18px rgba(190,24,93,0.95);transition:transform 120ms ease,filter 120ms ease;touch-action:manipulation;}
    #t5 .t5-start:not(:disabled):active{transform:translateY(1px) scale(0.98);filter:brightness(0.96);}
    #t5 .t5-start:disabled{cursor:default;opacity:0.62;}
    @keyframes t5-match-pop{0%{transform:scale(0.95)}65%{transform:scale(1.06)}100%{transform:scale(1)}}
    @keyframes t5-wrong-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
    @media (min-width:640px){
      #t5 .t5-board-shell{padding:1.1rem;}
      #t5 .t5-grid{gap:0.8rem;}
    }
    @media (prefers-reduced-motion:reduce){
      #t5 .t5-card-inner,#t5 .t5-progress-fill{transition:none;}
      #t5 .t5-card.is-matched .t5-card-front,#t5 .t5-card.is-wrong .t5-card-inner{animation:none;}
    }
  `;
  document.head.appendChild(style);

  function el(tag, className, text){
    const node = document.createElement(tag);
    if(className){ node.className = className; }
    if(text !== undefined){ node.textContent = text; }
    return node;
  }

  const wrapper = el('div', 't5-wrapper');
  const overview = el('div', 't5-overview');
  const overviewPairs = el('div', 't5-overview-item');
  overviewPairs.append(el('span', 't5-overview-icon', '🃏'));
  const overviewPairsCopy = el('span');
  const overviewPairsLabel = el('span', 't5-overview-label', translate('t5.pairs_label', null, 'Paires à trouver'));
  const overviewPairsValue = el('span', 't5-overview-value');
  overviewPairsCopy.append(overviewPairsLabel, overviewPairsValue);
  overviewPairs.append(overviewPairsCopy);
  const overviewReveal = el('div', 't5-overview-item');
  overviewReveal.append(el('span', 't5-overview-icon', '👀'));
  const overviewRevealCopy = el('span');
  const overviewRevealLabel = el('span', 't5-overview-label', translate('t5.reveal_label', null, 'Mémorisation'));
  const overviewRevealValue = el('span', 't5-overview-value');
  overviewRevealCopy.append(overviewRevealLabel, overviewRevealValue);
  overviewReveal.append(overviewRevealCopy);
  overview.append(overviewPairs, overviewReveal);

  const hud = el('div', 't5-hud');
  function makeStat(label){
    const item = el('div', 't5-stat');
    const labelEl = el('span', 't5-stat-label', label);
    const valueEl = el('span', 't5-stat-value', '0');
    item.append(labelEl, valueEl);
    hud.append(item);
    return valueEl;
  }
  const foundValue = makeStat(translate('t5.found_label', null, 'Paires trouvées'));
  const mistakesValue = makeStat(translate('t5.mistakes_label', null, 'Erreurs'));
  const timeValue = makeStat(translate('t5.time_label', null, 'Temps'));

  const progressWrap = el('div', 't5-progress-wrap');
  const progressLine = el('div', 't5-progress-line');
  const progressLabel = el('span', null, translate('t5.progress_label', null, 'Progression'));
  const progressText = el('span');
  progressLine.append(progressLabel, progressText);
  const progressTrack = el('div', 't5-progress-track');
  const progressFill = el('div', 't5-progress-fill');
  progressTrack.appendChild(progressFill);
  progressWrap.append(progressLine, progressTrack);

  const boardShell = el('div', 't5-board-shell');
  const emptyState = el('div', 't5-empty');
  emptyState.append(el('span', 't5-empty-icon', '🍻'), el('span', null, translate('t5.empty_board', null, 'Le plateau est prêt. Lance une partie pour commencer.')));
  const grid = el('div', 't5-grid is-hidden');
  boardShell.append(emptyState, grid);

  const message = el('div', 't5-message', translate('t5.help_idle', null, 'Retourne les dessous de verre pour former toutes les paires.'));
  message.setAttribute('aria-live', 'polite');
  const startWrap = el('div', 't5-start-wrap');
  const startBtn = el('button', 't5-start', translate('t5.button_start', null, 'Démarrer le mémory'));
  startBtn.type = 'button';
  startWrap.appendChild(startBtn);

  wrapper.append(overview, hud, progressWrap, boardShell, message, startWrap);
  box.appendChild(wrapper);

  const state = {
    cards: [],
    selected: [],
    matches: 0,
    mistakes: 0,
    running: false,
    locked: true,
    startedAt: 0,
    elapsed: 0,
    rafId: null,
    runToken: 0
  };

  function updateOverview(){
    overviewPairsValue.textContent = `${config.pairs} ${translate('t5.pairs_short', null, 'paires')}`;
    overviewRevealValue.textContent = `${Math.max(1, Math.round(config.reveal / 1000))}s ${translate('t5.reveal_short', null, 'pour mémoriser')}`;
  }

  function setMessage(text, tone){
    message.textContent = text;
    if(tone){
      message.dataset.tone = tone;
    } else {
      delete message.dataset.tone;
    }
  }

  function setGridColumns(cardCount){
    const narrow = window.innerWidth < 520;
    const columns = narrow ? Math.min(4, Math.max(2, Math.ceil(Math.sqrt(cardCount)))) : Math.min(6, Math.max(3, Math.ceil(Math.sqrt(cardCount))));
    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  }

  function buildDeck(){
    const selectedBrands = shuffle(BRANDS.slice()).slice(0, config.pairs);
    const deck = [];
    selectedBrands.forEach((brand, index) => {
      deck.push({ brand, id: `${brand.key}-${index}-a` });
      deck.push({ brand, id: `${brand.key}-${index}-b` });
    });
    return shuffle(deck);
  }

  function renderCard(card){
    const visible = card.revealed || card.matched;
    card.button.className = 't5-card';
    card.button.classList.toggle('is-revealed', visible);
    card.button.classList.toggle('is-matched', card.matched);
    card.button.style.setProperty('--brand-color', card.brand.color);
    card.button.style.setProperty('--brand-text', card.brand.text);
    card.button.disabled = !state.running || card.matched;
    card.button.setAttribute('aria-label', visible ? card.brand.label : translate('t5.card_hidden', null, 'Dessous de verre face cachée'));
  }

  function createCard(entry){
    const button = el('button', 't5-card');
    button.type = 'button';
    const inner = el('span', 't5-card-inner');
    const front = el('span', 't5-card-face t5-card-front');
    front.append(el('span', 't5-brand-dot'), el('span', 't5-brand-label', entry.brand.label), el('span', 't5-coaster-mark', '✦'));
    const back = el('span', 't5-card-face t5-card-back');
    inner.append(front, back);
    button.appendChild(inner);
    const card = { id: entry.id, brand: entry.brand, button, revealed: false, matched: false };
    button.addEventListener('click', () => onCardClick(card));
    renderCard(card);
    return card;
  }

  function prepareGrid(){
    grid.replaceChildren();
    state.cards = buildDeck().map(createCard);
    setGridColumns(state.cards.length);
    state.cards.forEach((card) => grid.appendChild(card.button));
  }

  function updateStats(){
    const elapsed = state.running ? performance.now() - state.startedAt : state.elapsed;
    const seconds = Math.max(0, Math.round(elapsed / 1000));
    foundValue.textContent = `${state.matches}/${config.pairs}`;
    mistakesValue.textContent = String(state.mistakes);
    timeValue.textContent = `${seconds}s`;
    progressText.textContent = `${state.matches}/${config.pairs}`;
    progressFill.style.width = `${config.pairs ? (state.matches / config.pairs) * 100 : 0}%`;
  }

  function tick(){
    if(!state.running){
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
      return;
    }
    updateStats();
    state.rafId = requestAnimationFrame(tick);
  }

  function computeScore(mistakes, elapsed){
    const maxMistakes = Math.max(1, config.pairs * 2);
    const accuracyScore = (1 - clamp(mistakes / maxMistakes, 0, 1)) * 100;
    let speedScore = 0;
    if(Number.isFinite(elapsed)){
      if(elapsed <= config.best){ speedScore = 100; }
      else if(elapsed < config.worst){ speedScore = clamp((config.worst - elapsed) / Math.max(1, config.worst - config.best), 0, 1) * 100; }
    }
    const weightSum = config.accWeight + config.speedWeight;
    const accWeight = weightSum > 0 ? config.accWeight / weightSum : 0.5;
    const speedWeight = weightSum > 0 ? config.speedWeight / weightSum : 0.5;
    return Math.round(clamp((accWeight * accuracyScore) + (speedWeight * speedScore), 0, 100));
  }

  function finishGame(){
    state.running = false;
    state.locked = true;
    state.elapsed = Math.max(0, performance.now() - state.startedAt);
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
    state.cards.forEach(renderCard);
    updateStats();
    const score = computeScore(state.mistakes, state.elapsed);
    if(window.jsdSession && typeof window.jsdSession.invalidateSubmission === 'function'){
      window.jsdSession.invalidateSubmission();
    } else {
      try{ localStorage.removeItem('jsd:score_submitted'); localStorage.removeItem('jsd:last_submission'); } catch(err){}
    }
    try{
      localStorage.setItem('jsd:mem', JSON.stringify({ pairs: config.pairs, mistakes: state.mistakes, elapsed_ms: Math.round(state.elapsed), score }));
      localStorage.setItem('jsd:done:t5', '1');
    } catch(err){}
    const next = document.getElementById('next');
    if(next){ next.classList.remove('opacity-50', 'pointer-events-none'); }
    grid.classList.add('is-complete');
    startWrap.classList.add('is-hidden');
    setMessage(translate('t5.done_message', { score }, `Mémoire terminée ✔ Score ${score}/100`), 'success');
    const nextRoute = flow && typeof flow.nextRoute === 'function' ? flow.nextRoute('t5') : '/results';
    setTimeout(() => { location.href = nextRoute; }, 900);
  }

  function clearSelection(){
    state.selected.length = 0;
  }

  function onCardClick(card){
    if(state.locked || !state.running || card.matched || card.revealed){
      return;
    }
    card.revealed = true;
    renderCard(card);
    state.selected.push(card);
    if(state.selected.length < 2){
      return;
    }
    state.locked = true;
    const [first, second] = state.selected;
    if(first.brand.key === second.brand.key){
      first.matched = true;
      second.matched = true;
      state.matches += 1;
      clearSelection();
      renderCard(first);
      renderCard(second);
      state.locked = false;
      setMessage(translate('t5.match_message', null, 'Bien vu ! Cette paire est à toi.'), 'success');
      if(state.matches >= config.pairs){
        finishGame();
      }
    } else {
      state.mistakes += 1;
      first.button.classList.add('is-wrong');
      second.button.classList.add('is-wrong');
      setMessage(translate('t5.miss_message', null, 'Pas la même paire… mémorise bien leur emplacement.'), 'warning');
      setTimeout(() => {
        first.revealed = false;
        second.revealed = false;
        renderCard(first);
        renderCard(second);
        clearSelection();
        state.locked = false;
      }, config.hide);
    }
    updateStats();
  }

  function revealAll(){
    state.cards.forEach((card) => {
      card.revealed = true;
      renderCard(card);
    });
  }

  function hideAll(){
    state.cards.forEach((card) => {
      if(!card.matched){
        card.revealed = false;
        renderCard(card);
      }
    });
  }

  function resetState(){
    state.runToken += 1;
    state.selected = [];
    state.matches = 0;
    state.mistakes = 0;
    state.running = false;
    state.locked = true;
    state.startedAt = 0;
    state.elapsed = 0;
    if(state.rafId){
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    updateStats();
  }

  function startGame(){
    if(state.running || startBtn.disabled){
      return;
    }
    resetState();
    prepareGrid();
    const runToken = state.runToken;
    emptyState.classList.add('is-hidden');
    grid.classList.remove('is-hidden', 'is-complete');
    startWrap.classList.add('is-hidden');
    startBtn.disabled = true;
    startBtn.textContent = translate('t5.preview_button', null, 'Mémorisation…');
    setMessage(translate('t5.preview_message', { seconds: Math.max(1, Math.round(config.reveal / 1000)) }, 'Observe bien : les dessous de verre vont se retourner.'), 'warning');
    revealAll();
    setTimeout(() => {
      if(state.runToken !== runToken){
        return;
      }
      hideAll();
      state.running = true;
      state.cards.forEach(renderCard);
      state.locked = false;
      state.startedAt = performance.now();
      startBtn.textContent = translate('t5.game_message', null, 'En cours…');
      setMessage(translate('t5.game_message', null, 'Retourne les dessous de verre et retrouve les mêmes marques !'));
      updateStats();
      state.rafId = requestAnimationFrame(tick);
    }, config.reveal);
  }

  startBtn.addEventListener('click', startGame);
  window.addEventListener('resize', () => {
    if(state.cards.length){
      setGridColumns(state.cards.length);
    }
  });
  updateOverview();
  updateStats();
  loadSettings();
})();
