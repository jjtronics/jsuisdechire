(function(){
  function getNicknameMaxLength(){
    const raw = window.jsdConfig && window.jsdConfig.settings ? window.jsdConfig.settings.nickname_max_length : null;
    const num = Number(raw);
    if (Number.isFinite(num) && num > 0){
      return Math.max(1, Math.min(512, Math.floor(num)));
    }
    return 0;
  }

  function sanitizeNickname(value){
    const trimmed = (value || '').trim();
    const maxLen = getNicknameMaxLength();
    if (maxLen > 0){
      return trimmed.slice(0, maxLen);
    }
    return trimmed;
  }

  function readJson(key){
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (err){
      return null;
    }
  }

  function writeJson(key, value){
    try {
      if (value == null){
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (err){}
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
    return !!sanitizeNickname(localStorage.getItem('jsd:nick'));
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

  function invalidateSubmission(){
    setSubmissionState(null);
    setLastSubmissionInfo(null);
  }

  function getLastSubmissionInfo(){
    return readJson('jsd:last_submission');
  }

  function setLastSubmissionInfo(info){
    if (!info){
      localStorage.removeItem('jsd:last_submission');
      return;
    }
    writeJson('jsd:last_submission', info);
  }

  async function submitScore(options){
    options = options || {};
    if (!options.force && submissionState() === '1'){
      return { status: 'already', cached: getLastSubmissionInfo() };
    }
    if (!hasNickname()){
      return { status: 'nonick' };
    }
    const { rxn, str, prs, bal, total } = gatherScores();
    if (!Number.isFinite(total)){
      return { status: 'noscore' };
    }

    const rawNickname = localStorage.getItem('jsd:nick');
    const nickname = sanitizeNickname(rawNickname);
    if ((rawNickname || '').trim() !== nickname){
      localStorage.setItem('jsd:nick', nickname);
    }
    if (!nickname){
      return { status: 'nonick' };
    }

    const payload = { nickname, total_score: total, rxn, str, prs, bal };
    const totalForStorage = Number.isFinite(total) ? Math.trunc(total) : null;

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
        const rankNum = Number(json.rank);
        const totalEntriesNum = Number(json.total_entries);
        const storedInfo = {
          id: json.id != null ? json.id : null,
          rank: Number.isFinite(rankNum) ? Math.trunc(rankNum) : null,
          total_entries: Number.isFinite(totalEntriesNum) ? Math.trunc(totalEntriesNum) : null,
          total_score: totalForStorage,
          nickname
        };
        setLastSubmissionInfo(storedInfo);
        return { status: 'ok', response: json, saved: storedInfo };
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
    invalidateSubmission();
    ['jsd:done:t1','jsd:done:t2','jsd:done:t3','jsd:done:t4','jsd:skip:t4','jsd:rxn','jsd:str','jsd:prs','jsd:bal']
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
    submissionState,
    getNicknameMaxLength,
    sanitizeNickname,
    getLastSubmissionInfo,
    invalidateSubmission
  };
})();
