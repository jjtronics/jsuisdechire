(function(){
  const box = document.getElementById('t5');
  if(!box){ return; }
  const t = (window.i18n) || ((key)=>key);

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
    for(let i=list.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [list[i],list[j]]=[list[j],list[i]];
    }
    return list;
  }

  function parseNumber(value, fallback){
    if(value==null){ return fallback; }
    const num = Number.parseFloat(String(value).replace(',','.'));
    return Number.isFinite(num) ? num : fallback;
  }

  function clamp(num, min, max){
    return Math.max(min, Math.min(max, num));
  }

  function defaults(raw){
    const maxPairs = Math.min(12, BRANDS.length);
    const rawPairs = parseNumber(raw.mem_pairs, 8);
    let pairs = Math.round(clamp(rawPairs, 2, maxPairs));
    if(!Number.isFinite(pairs) || pairs < 2){ pairs = 8; }
    const reveal = Math.round(clamp(parseNumber(raw.mem_initial_reveal_ms, 1500), 300, 5000));
    const hide = Math.round(clamp(parseNumber(raw.mem_mismatch_hide_ms, 900), 150, 4000));
    let accWeight = parseNumber(raw.mem_accuracy_weight, 0.6);
    let speedWeight = parseNumber(raw.mem_speed_weight, 0.4);
    if(!Number.isFinite(accWeight) || accWeight < 0){ accWeight = 0.6; }
    if(!Number.isFinite(speedWeight) || speedWeight < 0){ speedWeight = 0.4; }
    const bestCandidate = Math.round(parseNumber(raw.mem_time_best_ms, 45000));
    const worstCandidate = Math.round(parseNumber(raw.mem_time_worst_ms, 120000));
    const best = Math.max(5000, bestCandidate);
    const worst = Math.max(best + 1000, worstCandidate);
    return {
      pairs,
      reveal,
      hide,
      accWeight,
      speedWeight,
      best,
      worst
    };
  }

  let config = defaults({});

  async function loadSettings(){
    try {
      const response = await fetch('/api/settings', { cache: 'no-store' });
      if(!response.ok){ return; }
      const data = await response.json();
      config = defaults(data || {});
    } catch(err){
      /* ignore network errors */
    }
  }

  function el(tag, cls, html){
    const node = document.createElement(tag);
    if(cls){ node.className = cls; }
    if(html !== undefined){ node.innerHTML = html; }
    return node;
  }

  const startWrap = el('div','flex flex-col items-center gap-3');
  const startBtn = el('button','px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition', t('t5.button_start'));
  startBtn.type = 'button';
  startWrap.append(startBtn);

  const message = el('div','text-sm text-slate-600 dark:text-slate-300', t('t5.help_idle'));
  const stats = el('div','text-sm font-semibold text-slate-700 dark:text-slate-200','');
  const grid = el('div','grid gap-3 pointer-events-none opacity-40 select-none');

  box.append(startWrap, message, stats, grid);

  function setGridColumns(cardCount){
    const columns = Math.min(6, Math.max(2, Math.round(Math.sqrt(cardCount))));
    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  }

  const state = {
    cards: [],
    selected: [],
    matches: 0,
    mistakes: 0,
    running: false,
    locked: true,
    startedAt: 0,
    elapsed: 0,
    rafId: null
  };

  function renderCard(card){
    const base = 'relative aspect-[3/4] rounded-2xl border transition transform duration-150 flex items-center justify-center text-center px-2';
    if(card.matched){
      card.button.className = base + ' border-emerald-400 bg-emerald-100/80 shadow-inner scale-[0.98]';
      card.button.style.backgroundColor = '';
      card.button.style.color = '';
      card.button.innerHTML = `<span class="text-base font-semibold" style="color:${card.brand.text}">${card.brand.label}</span>`;
    } else if(card.revealed){
      card.button.className = base + ' border-rose-400 bg-white/90 shadow scale-[1.02]';
      card.button.style.backgroundColor = card.brand.color;
      card.button.style.color = card.brand.text;
      card.button.innerHTML = `<span class="text-base font-semibold">${card.brand.label}</span>`;
    } else {
      card.button.className = base + ' border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-800 text-2xl text-rose-500';
      card.button.style.backgroundColor = '';
      card.button.style.color = '';
      card.button.innerHTML = '<span>🍺</span>';
    }
  }

  function buildDeck(){
    const selectedBrands = shuffle(BRANDS.slice()).slice(0, config.pairs);
    const deck = [];
    selectedBrands.forEach((brand, idx)=>{
      deck.push({ brand, id:`${brand.key}-${idx}-a` });
      deck.push({ brand, id:`${brand.key}-${idx}-b` });
    });
    return shuffle(deck);
  }

  function clearSelection(){
    state.selected.length = 0;
  }

  function updateStats(){
    const elapsed = state.running ? (performance.now() - state.startedAt) : state.elapsed;
    const seconds = Math.max(0, Math.round(elapsed/1000));
    stats.textContent = t('t5.stats', {
      found: state.matches,
      total: config.pairs,
      mistakes: state.mistakes,
      time: seconds
    });
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
    const normalizedMistakes = clamp(mistakes / maxMistakes, 0, 1);
    const accuracyScore = (1 - normalizedMistakes) * 100;

    let speedScore = 0;
    if(Number.isFinite(elapsed) && elapsed >= 0){
      if(elapsed <= config.best){ speedScore = 100; }
      else if(elapsed >= config.worst){ speedScore = 0; }
      else {
        const ratio = (config.worst - elapsed) / Math.max(1, (config.worst - config.best));
        speedScore = clamp(ratio, 0, 1) * 100;
      }
    }
    const weightSum = config.accWeight + config.speedWeight;
    const accW = weightSum > 0 ? config.accWeight / weightSum : 0.5;
    const speedW = weightSum > 0 ? config.speedWeight / weightSum : 0.5;
    const raw = (accW * accuracyScore) + (speedW * speedScore);
    return Math.round(clamp(raw, 0, 100));
  }

  function finishGame(){
    state.running = false;
    state.locked = true;
    state.elapsed = Math.max(0, performance.now() - state.startedAt);
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
    updateStats();
    const score = computeScore(state.mistakes, state.elapsed);

    if(window.jsdSession && typeof window.jsdSession.invalidateSubmission==='function'){
      window.jsdSession.invalidateSubmission();
    } else {
      try{ localStorage.removeItem('jsd:score_submitted'); localStorage.removeItem('jsd:last_submission'); } catch(err){}
    }

    const payload = {
      pairs: config.pairs,
      mistakes: state.mistakes,
      elapsed_ms: Math.round(state.elapsed),
      score
    };
    try {
      localStorage.setItem('jsd:mem', JSON.stringify(payload));
      localStorage.setItem('jsd:done:t5','1');
    } catch(err){}

    const next = document.getElementById('next');
    if(next){ next.classList.remove('opacity-50','pointer-events-none'); }

    message.textContent = t('t5.done_message', { score });
    startBtn.textContent = t('t5.button_retry');
    startWrap.classList.remove('hidden');
    grid.classList.add('pointer-events-none');
    grid.classList.add('opacity-60');

    setTimeout(()=>{
      location.href = '/results';
    }, 700);
  }

  function onCardClick(card){
    if(state.locked || card.matched || card.revealed){ return; }
    card.revealed = true;
    renderCard(card);
    state.selected.push(card);

    if(state.selected.length < 2){ return; }

    state.locked = true;
    const [a,b] = state.selected;
    if(a.brand.key === b.brand.key){
      a.matched = true;
      b.matched = true;
      state.matches += 1;
      clearSelection();
      state.locked = false;
      if(state.matches >= config.pairs){
        finishGame();
      }
    } else {
      state.mistakes += 1;
      setTimeout(()=>{
        a.revealed = false;
        b.revealed = false;
        renderCard(a);
        renderCard(b);
        clearSelection();
        state.locked = false;
      }, config.hide);
    }
    updateStats();
  }

  function revealAll(){
    state.cards.forEach(card=>{
      card.revealed = true;
      renderCard(card);
    });
  }

  function hideAll(){
    state.cards.forEach(card=>{
      if(!card.matched){
        card.revealed = false;
        renderCard(card);
      }
    });
  }

  function prepareGrid(){
    grid.innerHTML = '';
    state.cards = [];
    const deck = buildDeck();
    setGridColumns(deck.length);
    deck.forEach(entry => {
      const button = el('button','', '');
      button.type = 'button';
      const card = {
        id: entry.id,
        brand: entry.brand,
        button,
        revealed: false,
        matched: false
      };
      button.addEventListener('click', ()=> onCardClick(card));
      state.cards.push(card);
      renderCard(card);
      grid.append(button);
    });
  }

  function resetState(){
    state.selected = [];
    state.matches = 0;
    state.mistakes = 0;
    state.running = false;
    state.locked = true;
    state.startedAt = 0;
    state.elapsed = 0;
    if(state.rafId){ cancelAnimationFrame(state.rafId); state.rafId = null; }
    updateStats();
  }

  function startGame(){
    startWrap.classList.add('hidden');
    grid.classList.remove('pointer-events-none');
    grid.classList.remove('opacity-60');
    grid.classList.remove('opacity-40');
    message.textContent = t('t5.preview_message', { seconds: Math.max(1, Math.round(config.reveal/1000)) });

    resetState();
    prepareGrid();
    revealAll();
    setTimeout(()=>{
      hideAll();
      state.locked = false;
      state.running = true;
      state.startedAt = performance.now();
      message.textContent = t('t5.game_message');
      updateStats();
      state.rafId = requestAnimationFrame(tick);
    }, config.reveal);
  }

  startBtn.addEventListener('click', startGame);
  updateStats();
  loadSettings();
})();
