(function(){
  const isAdminPreview = new URLSearchParams(window.location.search).get('admin_preview') === '1';
  if (isAdminPreview || (window.jsdConfig && window.jsdConfig.preview)){
    return;
  }
  const HOME_ROUTE = '/';
  const SELECT_ROUTE = '/select-games';
  const RESULTS_ROUTE = '/results';
  const PATH_TO_TEST = {
    '/t1': 't1',
    '/t2': 't2',
    '/t3': 't3',
    '/t4': 't4',
    '/t5': 't5',
    '/t6': 't6',
    '/t7': 't7',
    '/t8': 't8',
    '/t9': 't9',
    '/t10': 't10',
  };
  const FALLBACK_SEQUENCE = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'];
  const FALLBACK_ROUTES = {
    t1: '/t1',
    t2: '/t2',
    t3: '/t3',
    t4: '/t4',
    t5: '/t5',
    t6: '/t6',
    t7: '/t7',
    t8: '/t8',
    t9: '/t9',
    t10: '/t10',
  };

  const path = location.pathname;
  const hasNickname = !!(localStorage.getItem('jsd:nick') || '').trim();
  function routeForTest(id){
    if (window.jsdFlow && typeof window.jsdFlow.routeFor === 'function'){
      return window.jsdFlow.routeFor(id);
    }
    return FALLBACK_ROUTES[id] || FALLBACK_ROUTES.t1;
  }

  function firstRoute(){
    if (window.jsdFlow && typeof window.jsdFlow.firstRoute === 'function'){
      return window.jsdFlow.firstRoute();
    }
    return FALLBACK_ROUTES.t1;
  }

  function isCompleted(id){
    if (id === 't4'){
      return localStorage.getItem('jsd:done:t4') === '1'
        || localStorage.getItem('jsd:skip:t4') === '1';
    }
    return localStorage.getItem(`jsd:done:${id}`) === '1';
  }

  function getSequence(){
    if (window.jsdFlow && typeof window.jsdFlow.ensureSequence === 'function'){
      try {
        const seq = window.jsdFlow.ensureSequence();
        if (Array.isArray(seq) && seq.length){
          return seq.slice();
        }
      } catch (err){}
    }
    return FALLBACK_SEQUENCE.slice();
  }

  function findFirstIncomplete(sequence){
    for (let i = 0; i < sequence.length; i += 1){
      if (!isCompleted(sequence[i])){
        return sequence[i];
      }
    }
    return null;
  }

  const currentTestId = PATH_TO_TEST[path] || null;
  const sequence = getSequence();

  if (!currentTestId && path !== RESULTS_ROUTE){
    if ((currentTestId || path === RESULTS_ROUTE || path === SELECT_ROUTE) && !hasNickname){
      location.replace(HOME_ROUTE);
    }
    return;
  }

  if (!hasNickname){
    if (currentTestId || path === RESULTS_ROUTE){
      location.replace(HOME_ROUTE);
    }
    return;
  }

  if (currentTestId){
    if (!sequence.includes(currentTestId)){
      const redirect = sequence.length ? routeForTest(sequence[0]) : RESULTS_ROUTE;
      if (path !== redirect){
        location.replace(redirect);
      }
      return;
    }
    const index = sequence.indexOf(currentTestId);
    const requiredIds = sequence.slice(0, index);
    const blockingId = requiredIds.find((id) => !isCompleted(id));
    if (blockingId){
      const redirect = routeForTest(blockingId);
      if (path !== redirect){
        location.replace(redirect);
      }
      return;
    }
    // A completed game is final for this run. Reloading it or using Back must
    // continue the sequence instead of opening a second attempt.
    if (isCompleted(currentTestId)){
      const nextIncomplete = sequence.slice(index + 1).find((id) => !isCompleted(id));
      const redirect = nextIncomplete ? routeForTest(nextIncomplete) : RESULTS_ROUTE;
      if (path !== redirect){
        location.replace(redirect);
      }
      return;
    }
    // Every game writes its completion marker when its score is final. Some
    // games own a bespoke transition; this common watcher covers the rest so
    // a player always advances without needing to click a secondary button.
    let advancing = false;
    const advanceAfterCompletion = () => {
      if (advancing || !isCompleted(currentTestId)) return;
      advancing = true;
      const nextIncomplete = sequence.slice(index + 1).find((id) => !isCompleted(id));
      const redirect = nextIncomplete ? routeForTest(nextIncomplete) : RESULTS_ROUTE;
      window.setTimeout(() => location.replace(redirect), 700);
    };
    window.setInterval(advanceAfterCompletion, 250);
    return;
  }

  if (path === RESULTS_ROUTE){
    const firstIncomplete = findFirstIncomplete(sequence);
    if (firstIncomplete){
      const redirect = routeForTest(firstIncomplete);
      if (path !== redirect){
        location.replace(redirect);
      }
      return;
    }
    return;
  }

  if (!sequence.length && path !== RESULTS_ROUTE){
    location.replace(firstRoute());
  }
})();
