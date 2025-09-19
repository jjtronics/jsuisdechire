(function(){
  function readJson(key){
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (err){
      return null;
    }
  }

  function computeTotal(parts){
    const weights = { rxn:0.3, str:0.3, prs:0.3, bal:0.1 };
    let score = 0;
    let weightSum = 0;

    if (parts && parts.rxn && Number.isFinite(parts.rxn.score)){
      score += parts.rxn.score * weights.rxn;
      weightSum += weights.rxn;
    }
    if (parts && parts.str && Number.isFinite(parts.str.score)){
      score += parts.str.score * weights.str;
      weightSum += weights.str;
    }
    if (parts && parts.prs && Number.isFinite(parts.prs.score)){
      score += parts.prs.score * weights.prs;
      weightSum += weights.prs;
    }
    if (parts && parts.bal && Number.isFinite(parts.bal.score)){
      score += parts.bal.score * weights.bal;
      weightSum += weights.bal;
    }

    if (weightSum <= 0){
      return NaN;
    }
    return score / weightSum;
  }

  function gatherScores(){
    const rxn = readJson('jsd:rxn');
    const str = readJson('jsd:str');
    const prs = readJson('jsd:prs');
    const bal = readJson('jsd:bal');
    const total = computeTotal({ rxn, str, prs, bal });
    return { rxn, str, prs, bal, total };
  }

  function hasNickname(){
    return !!(localStorage.getItem('jsd:nick') || '').trim();
  }

  function submissionState(){
    return localStorage.getItem('jsd:score_submitted');
  }

  function setSubmissionState(state){
    if (state == null){
      localStorage.removeItem('jsd:score_submitted');
    } else {
      localStorage.setItem('jsd:score_submitted', state);
    }
  }

  async function submitScore(options){
    options = options || {};
    if (!options.force && submissionState() === '1'){
      return { status: 'already' };
    }
    if (!hasNickname()){
      return { status: 'nonick' };
    }
    const { rxn, str, prs, bal, total } = gatherScores();
    if (!Number.isFinite(total)){
      return { status: 'noscore' };
    }

    const nickname = (localStorage.getItem('jsd:nick') || '').trim();
    const payload = { nickname, total_score: total, rxn, str, prs, bal };

    try {
      setSubmissionState('pending');
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let json = null;
      try {
        json = await response.json();
      } catch (err) {}
      if (response.ok && json && json.ok){
        setSubmissionState('1');
        return { status: 'ok', response: json };
      }
      setSubmissionState('0');
      return { status: 'error', response: json, httpStatus: response.status };
    } catch (err){
      setSubmissionState('0');
      return { status: 'error', error: err };
    }
  }

  function resetProgress(options){
    options = options || {};
    const keepNickname = options.keepNickname !== false;
    ['jsd:done:t1','jsd:done:t2','jsd:done:t3','jsd:done:t4','jsd:skip:t4','jsd:rxn','jsd:str','jsd:prs','jsd:bal','jsd:score_submitted']
      .forEach(key => localStorage.removeItem(key));
    if (!keepNickname){
      localStorage.removeItem('jsd:nick');
    }
  }

  window.jsdSession = {
    readJson,
    computeTotal,
    gatherScores,
    submitScore,
    resetProgress,
    hasNickname,
    submissionState
  };
})();
