(function(){
  const STORAGE_KEY = 'jsd:test_sequence_v1';
  const HOME_ROUTE = '/';
  const RESULTS_ROUTE = '/results';
  const TESTS = [
    { id: 't1', route: '/t1', settingKey: 'game_rxn_enabled', doneKey: 'jsd:done:t1' },
    { id: 't2', route: '/t2', settingKey: 'game_str_enabled', doneKey: 'jsd:done:t2' },
    { id: 't3', route: '/t3', settingKey: 'game_prs_enabled', doneKey: 'jsd:done:t3' },
    { id: 't4', route: '/t4', settingKey: 'game_bal_enabled', doneKey: 'jsd:done:t4' },
    { id: 't5', route: '/t5', settingKey: 'game_mem_enabled', doneKey: 'jsd:done:t5' },
    { id: 't6', route: '/t6', settingKey: 'game_rfl_enabled', doneKey: 'jsd:done:t6' },
    { id: 't7', route: '/t7', settingKey: 'game_drv_enabled', doneKey: 'jsd:done:t7' },
  ];

  function safeParseInt(value){
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return Math.trunc(num);
  }

  function normalizeBoolean(value, fallback){
    if (value === undefined || value === null) return !!fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string'){
      const lowered = value.trim().toLowerCase();
      if (lowered === 'false' || lowered === '0' || lowered === 'no' || lowered === 'off'){
        return false;
      }
      if (lowered === 'true' || lowered === '1' || lowered === 'yes' || lowered === 'on'){
        return true;
      }
    }
    return !!value;
  }

  function getSettings(){
    const config = window.jsdConfig && window.jsdConfig.settings;
    return config && typeof config === 'object' ? config : {};
  }

  function normalizeSettings(rawSettings){
    const enabled = {};
    TESTS.forEach((test) => {
      enabled[test.id] = normalizeBoolean(rawSettings[test.settingKey], true);
    });
    const desiredTotal = safeParseInt(rawSettings.session_total_games);
    return { enabled, desiredTotal };
  }

  function computeSignature(config){
    const payload = { desiredTotal: config.desiredTotal, enabled: {} };
    TESTS.forEach((test) => {
      payload.enabled[test.id] = !!config.enabled[test.id];
    });
    try {
      return JSON.stringify(payload);
    } catch (err){
      return '';
    }
  }

  function routeFor(testId){
    const meta = TESTS.find((entry) => entry.id === testId);
    return meta ? meta.route : RESULTS_ROUTE;
  }

  function readStoredSequence(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const tests = Array.isArray(parsed.tests) ? parsed.tests.filter((id) => TESTS.some((t) => t.id === id)) : [];
      if (!tests.length) return null;
      return { tests, signature: typeof parsed.signature === 'string' ? parsed.signature : '' };
    } catch (err){
      return null;
    }
  }

  function writeStoredSequence(tests, signature){
    try {
      const payload = { tests: Array.isArray(tests) ? tests.slice() : [], signature: signature || '' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err){}
  }

  function resetStoredSequence(){
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err){}
  }

  function pickTests(config){
    const available = TESTS.filter((test) => config.enabled[test.id]);
    const pool = available.length ? available : TESTS.slice();
    const maxCount = pool.length || TESTS.length;
    let desired = config.desiredTotal;
    if (!Number.isFinite(desired) || desired == null){
      desired = maxCount;
    }
    desired = Math.trunc(desired);
    if (!Number.isFinite(desired) || desired <= 0){
      desired = maxCount;
    }
    desired = Math.min(Math.max(1, desired), pool.length);
    if (desired >= pool.length){
      return pool.map((entry) => entry.id);
    }
    const indices = pool.map((_, idx) => idx);
    for (let i = indices.length - 1; i > 0; i -= 1){
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    const selected = indices.slice(0, desired).sort((a, b) => a - b);
    return selected.map((idx) => pool[idx].id);
  }

  function ensureSequence(options){
    options = options || {};
    const config = normalizeSettings(getSettings());
    const signature = computeSignature(config);
    const stored = readStoredSequence();
    const needsNew = options.force || !stored || stored.signature !== signature || !stored.tests.length;
    if (!needsNew){
      return stored.tests.slice();
    }
    const tests = pickTests(config);
    writeStoredSequence(tests, signature);
    return tests.slice();
  }

  function getSequence(){
    const stored = readStoredSequence();
    if (stored && stored.tests.length){
      return stored.tests.slice();
    }
    return ensureSequence();
  }

  function firstRoute(){
    const sequence = getSequence();
    if (!sequence.length){
      return RESULTS_ROUTE;
    }
    return routeFor(sequence[0]);
  }

  function nextRoute(testId){
    const sequence = getSequence();
    if (!sequence.length){
      return RESULTS_ROUTE;
    }
    const index = sequence.indexOf(testId);
    if (index === -1){
      return routeFor(sequence[0]);
    }
    const nextId = sequence[index + 1];
    return nextId ? routeFor(nextId) : RESULTS_ROUTE;
  }

  function previousRoute(testId){
    const sequence = getSequence();
    if (!sequence.length){
      return HOME_ROUTE;
    }
    const index = sequence.indexOf(testId);
    if (index <= 0){
      return HOME_ROUTE;
    }
    return routeFor(sequence[index - 1]);
  }

  function isActive(testId){
    if (window.jsdConfig && window.jsdConfig.preview){
      return true;
    }
    return getSequence().includes(testId);
  }

  function prepareNewRun(){
    resetStoredSequence();
    const sequence = ensureSequence({ force: true });
    if (!sequence.length){
      return RESULTS_ROUTE;
    }
    return routeFor(sequence[0]);
  }

  function setupPage(testId, options){
    options = options || {};
    if (window.jsdConfig && window.jsdConfig.preview){
      const nextEl = options.nextSelector ? document.querySelector(options.nextSelector) : null;
      if (nextEl){
        nextEl.setAttribute('href', RESULTS_ROUTE);
      }
      const backEl = options.backSelector ? document.querySelector(options.backSelector) : null;
      if (backEl && options.hideBackIfFirst){
        backEl.classList.add('hidden');
        backEl.setAttribute('href', HOME_ROUTE);
      }
      if (typeof options.onReady === 'function'){
        options.onReady({ sequence: [testId], index: 0, nextRoute: RESULTS_ROUTE, prevRoute: HOME_ROUTE });
      }
      return { sequence: [testId], index: 0, nextRoute: RESULTS_ROUTE, prevRoute: HOME_ROUTE };
    }
    const sequence = ensureSequence();
    if (!sequence.length){
      if (location.pathname !== RESULTS_ROUTE){
        location.replace(RESULTS_ROUTE);
      }
      return null;
    }
    const index = sequence.indexOf(testId);
    if (index === -1){
      const redirect = routeFor(sequence[0]);
      if (location.pathname !== redirect){
        location.replace(redirect);
      }
      return null;
    }
    const nextId = sequence[index + 1];
    const prevId = sequence[index - 1];
    const computedNextRoute = nextId ? routeFor(nextId) : RESULTS_ROUTE;
    const computedPrevRoute = prevId ? routeFor(prevId) : HOME_ROUTE;

    if (options.nextSelector){
      const nextEl = document.querySelector(options.nextSelector);
      if (nextEl){
        const translator = typeof window.i18n === 'function' ? window.i18n : (key) => key;
        const defaultKey = nextEl.dataset.defaultI18n || nextEl.getAttribute('data-i18n') || 'common.next';
        const resultsKey = nextEl.dataset.resultsI18n || 'common.view_results';
        nextEl.setAttribute('href', computedNextRoute);
        if (computedNextRoute === RESULTS_ROUTE){
          nextEl.setAttribute('data-i18n', resultsKey);
          nextEl.textContent = translator(resultsKey);
        } else {
          nextEl.setAttribute('data-i18n', defaultKey);
          nextEl.textContent = translator(defaultKey);
        }
      }
    }

    if (options.backSelector){
      const backEl = document.querySelector(options.backSelector);
      if (backEl){
        if (prevId){
          backEl.setAttribute('href', computedPrevRoute);
          backEl.classList.remove('hidden');
        } else if (options.hideBackIfFirst){
          backEl.classList.add('hidden');
          backEl.setAttribute('href', HOME_ROUTE);
        } else {
          backEl.setAttribute('href', HOME_ROUTE);
        }
      }
    }

    if (typeof options.onReady === 'function'){
      options.onReady({
        sequence: sequence.slice(),
        index,
        nextRoute: computedNextRoute,
        prevRoute: computedPrevRoute,
      });
    }

    return {
      sequence: sequence.slice(),
      index,
      nextRoute: computedNextRoute,
      prevRoute: computedPrevRoute,
    };
  }

  window.jsdFlow = {
    ensureSequence,
    getSequence,
    nextRoute,
    previousRoute,
    firstRoute,
    prepareNewRun,
    resetSequence: resetStoredSequence,
    isActive,
    setupPage,
    routeFor,
  };
})();
