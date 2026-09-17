(function(){
  if (!(window.jsdConfig && window.jsdConfig.training)) return;
  const scoreKeys = {
    t1:'rxn', t2:'str', t3:'prs', t4:'bal', t5:'mem', t6:'rfl',
    t7:'drv', t8:'pong', t9:'ice', t10:'tilt', t11:'dino',
  };
  const gameId = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
  const scoreKey = scoreKeys[gameId];
  if (!scoreKey) return;
  const translate = key => window.i18n(key);
  let resultShown = false;

  function showResult(score){
    const style = document.createElement('style');
    style.textContent = `
      .training-result{width:min(26rem,calc(100% - 2rem));max-height:calc(100dvh - 2rem);overflow:auto;margin:auto;padding:2rem;border:1px solid #e2e8f0;border-radius:1.75rem;background:#fff;color:#0f172a;text-align:center;box-shadow:0 24px 80px #02061740}
      .training-result::backdrop{background:#0f172ab3;backdrop-filter:blur(6px)}
      .training-result-kicker{color:#7c3aed;font-size:.7rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
      .training-result h2{margin:.6rem 0;font-size:1.55rem;font-weight:900}
      .training-result-game{color:#64748b;font-size:.9rem}
      .training-result-score{margin:1.4rem 0;font-size:4.5rem;font-weight:900;line-height:1;color:#7c3aed;font-variant-numeric:tabular-nums}
      .training-result-score small{font-size:1.1rem;color:#64748b}
      .training-result-note{color:#64748b;font-size:.85rem;line-height:1.6}
      .training-result-actions{display:grid;gap:.75rem;margin-top:1.5rem}
      .training-result-replay,.training-result-return{display:block;width:100%;padding:1rem;border:1px solid transparent;border-radius:1rem;font:inherit;font-weight:800;line-height:1.4;text-decoration:none;cursor:pointer}
      .training-result-replay{background:linear-gradient(120deg,#7c3aed,#4f46e5);color:white}
      .training-result-return{background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe}
      .training-result-replay:hover,.training-result-return:hover{filter:brightness(1.1)}
      .training-result-replay:focus-visible,.training-result-return:focus-visible{outline:3px solid #c4b5fd;outline-offset:4px}
      html.dark .training-result{background:#0f172a;color:#f8fafc;border-color:#334155}
      html.dark .training-result-kicker,html.dark .training-result-score{color:#c4b5fd}
      html.dark .training-result-game,html.dark .training-result-note,html.dark .training-result-score small{color:#cbd5e1}
      html.dark .training-result-return{background:#1e1b4b;color:#ddd6fe;border-color:#4c1d95}
    `;
    document.head.appendChild(style);
    const dialog = document.createElement('dialog');
    dialog.className = 'training-result';
    dialog.setAttribute('aria-labelledby', 'training-result-title');
    dialog.setAttribute('aria-describedby', 'training-result-score');
    dialog.innerHTML = `
      <p class="training-result-kicker" data-i18n="training.eyebrow"></p>
      <h2 id="training-result-title" data-i18n="training.finished"></h2>
      <p class="training-result-game"></p>
      <p id="training-result-score" class="training-result-score"><span data-training-score></span><small> / 100</small></p>
      <p class="training-result-note" data-i18n="training.result_note"></p>
      <div class="training-result-actions">
        <button type="button" class="training-result-replay" data-i18n="training.replay"></button>
        <a class="training-result-return" href="/training" data-i18n="training.return"></a>
      </div>
    `;
    dialog.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = translate(el.getAttribute('data-i18n')); });
    dialog.querySelector('.training-result-game').textContent = translate(`selection.game.${gameId}.title`);
    dialog.querySelector('[data-training-score]').textContent = String(Math.round(score));
    // Reload the same training URL to reset all game state and the page-local
    // training storage without touching the player's normal session.
    dialog.querySelector('.training-result-replay').addEventListener('click', () => window.location.reload());
    // Keep the result visible until the player chooses an action. Game-level
    // keyboard shortcuts must not intercept the focused result controls.
    dialog.addEventListener('cancel', event => event.preventDefault());
    dialog.addEventListener('keydown', event => event.stopPropagation());
    dialog.addEventListener('keyup', event => event.stopPropagation());
    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.querySelector('.training-result-replay').focus();
  }

  function checkCompletion(){
    if (resultShown) return;
    let result;
    try {
      if (localStorage.getItem(`jsd:done:${gameId}`) !== '1') return;
      result = JSON.parse(localStorage.getItem(`jsd:${scoreKey}`));
    } catch (err) { return; }
    if (!result || !Number.isFinite(result.score)) return;
    resultShown = true;
    window.clearInterval(watcher);
    showResult(result.score);
  }
  // Training scores live in the page's isolated storage, including writes
  // made in this tab (which do not fire the browser's storage event).
  const watcher = window.setInterval(checkCompletion, 100);
  window.addEventListener('pagehide', () => window.clearInterval(watcher));
})();
