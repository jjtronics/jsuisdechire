(function(){
  const HOME_ROUTE = '/';
  const RESULTS_ROUTE = '/results';
  const PATH_TO_TEST = {
    '/t1': 't1',
    '/t2': 't2',
    '/t3': 't3',
    '/t4': 't4',
    '/t5': 't5',
  };
  const FALLBACK_SEQUENCE = ['t1', 't2', 't3', 't4', 't5'];
  const FALLBACK_ROUTES = {
    t1: '/t1',
    t2: '/t2',
    t3: '/t3',
    t4: '/t4',
    t5: '/t5',
  };

  const path = location.pathname;
  const hasNickname = !!(localStorage.getItem('jsd:nick') || '').trim();
  const done = {
    t1: localStorage.getItem('jsd:done:t1') === '1',
    t2: localStorage.getItem('jsd:done:t2') === '1',
    t3: localStorage.getItem('jsd:done:t3') === '1',
    t4: localStorage.getItem('jsd:done:t4') === '1',
    t5: localStorage.getItem('jsd:done:t5') === '1',
  };
  const skippedT4 = localStorage.getItem('jsd:skip:t4') === '1';

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
      return !!(done.t4 || skippedT4);
    }
    return !!done[id];
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
    if ((path === '/t1' || path === '/t2' || path === '/t3' || path === '/t4' || path === '/t5' || path === RESULTS_ROUTE) && !hasNickname){
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