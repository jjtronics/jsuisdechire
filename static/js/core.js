(function(){
  const path = location.pathname;
  const hasNickname = !!(localStorage.getItem('jsd:nick') || '').trim();
  const done = {
    t1: localStorage.getItem('jsd:done:t1') === '1',
    t2: localStorage.getItem('jsd:done:t2') === '1',
    t3: localStorage.getItem('jsd:done:t3') === '1',
    t4: localStorage.getItem('jsd:done:t4') === '1',
  };
  const skippedT4 = localStorage.getItem('jsd:skip:t4') === '1';

  const requirements = {
    '/t1': hasNickname,
    '/t2': hasNickname && done.t1,
    '/t3': hasNickname && done.t2,
    '/t4': hasNickname && done.t3,
    '/results': hasNickname && (done.t4 || skippedT4),
  };

  if (Object.prototype.hasOwnProperty.call(requirements, path) && !requirements[path]){
    if (!hasNickname){
      location.replace('/');
      return;
    }
    const back = path === '/t2' ? '/t1'
      : path === '/t3' ? '/t2'
      : path === '/t4' ? '/t3'
      : '/t1';
    location.replace(back);
  }
})();