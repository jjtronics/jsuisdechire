(function(){
  const LANG_LABELS = { fr: "FR", en: "EN", it: "IT" };
  const DICT = {
    fr: {
      "nav.theme_toggle": "Basculer le thème",
      "nav.leaderboard": "Top",
      "footer.disclaimer": "Ce n'est pas un dispositif médical. Si tu as bu : ne conduis jamais. · Dev par JJC",

      "home.title": "Un check fun & sérieux pour savoir si tu dois poser le verre",
      "home.subtitle": "Local, anonyme, gratuit. Résultats indicatifs uniquement.",
      "home.list1": "4 mini-tests rapides (réaction, couleurs, poursuite, équilibre)",
      "home.list2": "Aucune donnée envoyée sans ton accord",
      "home.list3": "À la fin : tu peux enregistrer ton score",
      "home.cta_start": "Commencer",
      "home.cta_leaderboard": "Voir le classement",

      "t1.heading": "Test 1 · Réaction",
      "t1.notice": "Prêt·e ? Dès que le fond passe au VERT, tape plus vite que ton ombre. Si tu tires trop tôt, on recommence !",
      "t2.heading": "Test 2 · Stroop",
      "t2.notice": "Lis bien : clique sur la couleur affichée, pas sur le mot écrit. Même pompette, ton cerveau peut y arriver.",
      "t3.heading": "Test 3 · Poursuite",
      "t3.notice": "Clique sur Démarrer : le cercle part en cavale. Poursuis-le avec ta souris (ou ton doigt) et clique dessus avant qu'il ne s'échappe trop longtemps.",
      "t4.heading": "Test 4 · Équilibre (mobile)",
      "t4.notice": "Téléphone dans la main, bras tendu : appuie sur Démarrer puis reste le plus immobile possible. Si tu bouges, le score se dandine aussi.",

      "common.back": "Retour",
      "common.next": "Suivant",
      "common.view_results": "Voir les résultats",
      "common.error": "Erreur",

      "t1.tap_to_start": "Clique pour démarrer",
      "t1.tap_with_progress": "Clique pour démarrer ({current}/{total})",
      "t1.instructions": "Clique quand le fond devient VERT. Si tu cliques trop tôt, c'est raté.",
      "t1.wait": "Patience…",
      "t1.go": "GO !",
      "t1.done": "Terminé ✔",

      "colors.red": "ROUGE",
      "colors.blue": "BLEU",
      "colors.green": "VERT",
      "colors.yellow": "JAUNE",
      "colors.purple": "VIOLET",
      "colors.black": "NOIR",

      "t3.hint": "Amène le curseur ici, puis clique Démarrer",
      "t3.button_start": "Démarrer",
      "t3.button_loading": "Chargement…",
      "t3.button_running": "En cours…",
      "t3.button_done": "Terminé ✔",
      "t3.button_caught": "Attrapé ! ✔",

      "t4.sensor_instruction": "Tiens le téléphone à plat, bras tendus, {seconds}s. Appuie sur Démarrer.",
      "t4.button_label": "Démarrer {seconds}s",
      "t4.button_measuring": "Mesure en cours…",
      "t4.button_blocked_http": "Bloqué en HTTP — passe en HTTPS",
      "t4.fallback_instruction": "Fallback : maintiens un doigt au centre du cercle pendant {seconds}s.",
      "t4.fallback_status_ready": "Pose ton doigt pour démarrer",
      "t4.fallback_status_running": "Mesure en cours…",
      "t4.fallback_status_short": "Mesure trop courte. Recommence.",
      "t4.fallback_status_done": "Terminé ✔",

      "results.heading": "Résultats",
      "results.total_label": "Score global",
      "results.reaction_detail": "Réaction — Médiane : {median} ms · Moyenne : {mean} ms · Score {score}",
      "results.stroop_detail": "Stroop — Précision : {accuracy}% · RT : {rt} ms · Score {score}",
      "results.pursuit_detail_time": "Poursuite — Score {score} · Attrapé en {time} ms",
      "results.pursuit_detail_mean": "Poursuite — Score {score} · Erreur : {error} px",
      "results.pursuit_detail_base": "Poursuite — Score {score}",
      "results.balance_sensors_detail": "Équilibre (capteurs) — σ : {std} g · Score {score}",
      "results.balance_touch_detail": "Équilibre (tactile) — σ : {std} px · Score {score}",
      "results.balance_skipped": "Équilibre non mesuré (capteurs indisponibles). Score calculé sur les autres tests.",
      "results.nickname_placeholder": "Surnom (optionnel)",
      "results.save_button": "Enregistrer le score",
      "results.save_success": "Enregistré !",
      "results.share_button": "Partager",
      "results.share_success": "Partagé !",
      "results.share_copied": "Message copié !",
      "results.share_error": "Partage impossible.",
      "results.share_message": "Eh voici mon score sur https://JsuisDechire.com : {score}, tu peux faire mieux ?",

      "leaderboard.heading": "Classement",
      "leaderboard.rank": "#",
      "leaderboard.name": "Nom",
      "leaderboard.score": "Score",
      "leaderboard.date": "Date",
      "leaderboard.empty": "Aucun score pour l'instant.",

      "admin.heading": "Admin · Calibration",
      "admin.subtitle": "Protège cette page via ton reverse proxy (HTTP auth). Les paramètres sont stockés en base et appliqués aux tests au chargement.",
      "admin.save_button": "Enregistrer",
      "admin.clear_button": "Vider les scores",
      "admin.saved": "Paramètres enregistrés ✔",
      "admin.cleared": "Scores supprimés ✔",
      "admin.confirm_clear": "Supprimer tous les scores ?",

      "admin.fields.prs_timeSpeed": "T3·timeSpeed (vitesse globale)",
      "admin.fields.prs_duration": "T3·durée (ms)",
      "admin.fields.prs_captureRadius": "T3·rayon capture (px)",
      "admin.fields.prs_jitterAmp": "T3·jitter",
      "admin.fields.bal_mode": "T4·mode",
      "admin.fields.bal_duration": "T4·durée (ms)",
      "admin.fields.bal_low_good": "T4·seuil haut (100) (g)",
      "admin.fields.bal_high_bad": "T4·seuil bas (0) (g)",
      "admin.fields.bal_mode.magnitude": "Magnitude (incl. gravité)",
      "admin.fields.bal_mode.linear": "Accélération linéaire"
    },
    en: {
      "nav.theme_toggle": "Toggle theme",
      "nav.leaderboard": "Leaderboard",
      "footer.disclaimer": "This is not a medical device. If you drank: never drive. · Dev by JJC",

      "home.title": "A fun & serious check to know if you should put the glass down",
      "home.subtitle": "Local, anonymous, free. Results are indicative only.",
      "home.list1": "4 quick mini-tests (reaction, colors, pursuit, balance)",
      "home.list2": "No data sent without your consent",
      "home.list3": "At the end: you can save your score",
      "home.cta_start": "Start",
      "home.cta_leaderboard": "See the leaderboard",

      "t1.heading": "Test 1 · Reaction",
      "t1.notice": "Ready? As soon as the background turns GREEN, tap faster than your shadow. Jumping the gun means a redo.",
      "t2.heading": "Test 2 · Stroop",
      "t2.notice": "Read carefully: click the ink color, not the word you read. Even tipsy, your brain can handle it.",
      "t3.heading": "Test 3 · Pursuit",
      "t3.notice": "Hit Start and the circle will bolt everywhere. Chase it with your mouse (or finger) and tap it before it gets away.",
      "t4.heading": "Test 4 · Balance (mobile)",
      "t4.notice": "Phone in hand, arm stretched out: press Start and stay as still as possible. Wobbles = wobbly score.",

      "common.back": "Back",
      "common.next": "Next",
      "common.view_results": "See results",
      "common.error": "Error",

      "t1.tap_to_start": "Tap to start",
      "t1.tap_with_progress": "Tap to start ({current}/{total})",
      "t1.instructions": "Tap when the background turns GREEN. If you tap too early, it's a fail.",
      "t1.wait": "Hold on…",
      "t1.go": "GO!",
      "t1.done": "Done ✔",

      "colors.red": "RED",
      "colors.blue": "BLUE",
      "colors.green": "GREEN",
      "colors.yellow": "YELLOW",
      "colors.purple": "PURPLE",
      "colors.black": "BLACK",

      "t3.hint": "Bring the cursor here, then click Start",
      "t3.button_start": "Start",
      "t3.button_loading": "Loading…",
      "t3.button_running": "Running…",
      "t3.button_done": "Done ✔",
      "t3.button_caught": "Caught! ✔",

      "t4.sensor_instruction": "Hold the phone flat, arms stretched, for {seconds}s. Press Start.",
      "t4.button_label": "Start {seconds}s",
      "t4.button_measuring": "Measuring…",
      "t4.button_blocked_http": "Blocked on HTTP — switch to HTTPS",
      "t4.fallback_instruction": "Fallback: keep one finger in the center of the circle for {seconds}s.",
      "t4.fallback_status_ready": "Place your finger to start",
      "t4.fallback_status_running": "Measuring…",
      "t4.fallback_status_short": "Measurement too short. Try again.",
      "t4.fallback_status_done": "Done ✔",

      "results.heading": "Results",
      "results.total_label": "Overall score",
      "results.reaction_detail": "Reaction — Median: {median} ms · Mean: {mean} ms · Score {score}",
      "results.stroop_detail": "Stroop — Accuracy: {accuracy}% · RT: {rt} ms · Score {score}",
      "results.pursuit_detail_time": "Pursuit — Score {score} · Caught in {time} ms",
      "results.pursuit_detail_mean": "Pursuit — Score {score} · Error: {error} px",
      "results.pursuit_detail_base": "Pursuit — Score {score}",
      "results.balance_sensors_detail": "Balance (sensors) — σ: {std} g · Score {score}",
      "results.balance_touch_detail": "Balance (touch) — σ: {std} px · Score {score}",
      "results.balance_skipped": "Balance not measured (sensors unavailable). Score computed from the other tests.",
      "results.nickname_placeholder": "Nickname (optional)",
      "results.save_button": "Save score",
      "results.save_success": "Saved!",
      "results.share_button": "Share",
      "results.share_success": "Shared!",
      "results.share_copied": "Message copied!",
      "results.share_error": "Share failed.",
      "results.share_message": "Hey, here's my score on https://JsuisDechire.com: {score}. Think you can beat it?",

      "leaderboard.heading": "Leaderboard",
      "leaderboard.rank": "#",
      "leaderboard.name": "Name",
      "leaderboard.score": "Score",
      "leaderboard.date": "Date",
      "leaderboard.empty": "No score yet.",

      "admin.heading": "Admin · Calibration",
      "admin.subtitle": "Protect this page through your reverse proxy (HTTP auth). Settings are stored in DB and applied to tests on load.",
      "admin.save_button": "Save",
      "admin.clear_button": "Clear scores",
      "admin.saved": "Settings saved ✔",
      "admin.cleared": "Scores cleared ✔",
      "admin.confirm_clear": "Delete all scores?",

      "admin.fields.prs_timeSpeed": "T3·timeSpeed (global speed)",
      "admin.fields.prs_duration": "T3·duration (ms)",
      "admin.fields.prs_captureRadius": "T3·capture radius (px)",
      "admin.fields.prs_jitterAmp": "T3·jitter",
      "admin.fields.bal_mode": "T4·mode",
      "admin.fields.bal_duration": "T4·duration (ms)",
      "admin.fields.bal_low_good": "T4·high threshold (100) (g)",
      "admin.fields.bal_high_bad": "T4·low threshold (0) (g)",
      "admin.fields.bal_mode.magnitude": "Magnitude (incl. gravity)",
      "admin.fields.bal_mode.linear": "Linear acceleration"
    },
    it: {
      "nav.theme_toggle": "Cambia tema",
      "nav.leaderboard": "Classifica",
      "footer.disclaimer": "Non è un dispositivo medico. Se hai bevuto: non guidare mai. · Dev da JJC",

      "home.title": "Un check divertente e serio per capire se devi posare il bicchiere",
      "home.subtitle": "Locale, anonimo, gratuito. Risultati solo indicativi.",
      "home.list1": "4 mini-test rapidi (reazione, colori, inseguimento, equilibrio)",
      "home.list2": "Nessun dato inviato senza il tuo consenso",
      "home.list3": "Alla fine: puoi salvare il tuo punteggio",
      "home.cta_start": "Inizia",
      "home.cta_leaderboard": "Vedi la classifica",

      "t1.heading": "Test 1 · Reazione",
      "t1.notice": "Prontə? Quando lo sfondo diventa VERDE, tocca più veloce della tua ombra. Se parti in anticipo, si ricomincia!",
      "t2.heading": "Test 2 · Stroop",
      "t2.notice": "Leggi bene: clicca sul colore che vedi, non sul nome scritto. Anche con qualche drink, il cervello ce la può fare.",
      "t3.heading": "Test 3 · Inseguimento",
      "t3.notice": "Premi Avvia: il cerchio impazzisce ovunque. Inseguilo con mouse o dito e cliccalo prima che scappi.",
      "t4.heading": "Test 4 · Equilibrio (mobile)",
      "t4.notice": "Telefono in mano, braccio teso: premi Avvia e resta il più fermo possibile. Se ti muovi, il punteggio barcolla.",

      "common.back": "Indietro",
      "common.next": "Avanti",
      "common.view_results": "Vedi i risultati",
      "common.error": "Errore",

      "t1.tap_to_start": "Tocca per iniziare",
      "t1.tap_with_progress": "Tocca per iniziare ({current}/{total})",
      "t1.instructions": "Tocca quando lo sfondo diventa VERDE. Se tocchi troppo presto è sbagliato.",
      "t1.wait": "Attendi…",
      "t1.go": "VIA!",
      "t1.done": "Finito ✔",

      "colors.red": "ROSSO",
      "colors.blue": "BLU",
      "colors.green": "VERDE",
      "colors.yellow": "GIALLO",
      "colors.purple": "VIOLA",
      "colors.black": "NERO",

      "t3.hint": "Porta il cursore qui, poi clicca Avvia",
      "t3.button_start": "Avvia",
      "t3.button_loading": "Caricamento…",
      "t3.button_running": "In corso…",
      "t3.button_done": "Finito ✔",
      "t3.button_caught": "Preso! ✔",

      "t4.sensor_instruction": "Tieni il telefono in piano, braccia tese, per {seconds}s. Premi Avvia.",
      "t4.button_label": "Avvia {seconds}s",
      "t4.button_measuring": "Misurazione in corso…",
      "t4.button_blocked_http": "Bloccato in HTTP — passa a HTTPS",
      "t4.fallback_instruction": "Fallback: tieni un dito al centro del cerchio per {seconds}s.",
      "t4.fallback_status_ready": "Metti il dito per iniziare",
      "t4.fallback_status_running": "Misurazione in corso…",
      "t4.fallback_status_short": "Misurazione troppo breve. Riprova.",
      "t4.fallback_status_done": "Finito ✔",

      "results.heading": "Risultati",
      "results.total_label": "Punteggio globale",
      "results.reaction_detail": "Reazione — Mediana: {median} ms · Media: {mean} ms · Punteggio {score}",
      "results.stroop_detail": "Stroop — Precisione: {accuracy}% · RT: {rt} ms · Punteggio {score}",
      "results.pursuit_detail_time": "Inseguimento — Punteggio {score} · Preso in {time} ms",
      "results.pursuit_detail_mean": "Inseguimento — Punteggio {score} · Errore: {error} px",
      "results.pursuit_detail_base": "Inseguimento — Punteggio {score}",
      "results.balance_sensors_detail": "Equilibrio (sensori) — σ: {std} g · Punteggio {score}",
      "results.balance_touch_detail": "Equilibrio (touch) — σ: {std} px · Punteggio {score}",
      "results.balance_skipped": "Equilibrio non misurato (sensori non disponibili). Punteggio calcolato sugli altri test.",
      "results.nickname_placeholder": "Soprannome (facoltativo)",
      "results.save_button": "Salva punteggio",
      "results.save_success": "Salvato!",
      "results.share_button": "Condividi",
      "results.share_success": "Condiviso!",
      "results.share_copied": "Messaggio copiato!",
      "results.share_error": "Condivisione non riuscita.",
      "results.share_message": "Ehi, ecco il mio punteggio su https://JsuisDechire.com: {score}, sai fare di meglio?",

      "leaderboard.heading": "Classifica",
      "leaderboard.rank": "#",
      "leaderboard.name": "Nome",
      "leaderboard.score": "Punteggio",
      "leaderboard.date": "Data",
      "leaderboard.empty": "Nessun punteggio per ora.",

      "admin.heading": "Admin · Calibrazione",
      "admin.subtitle": "Proteggi questa pagina tramite il tuo reverse proxy (autenticazione HTTP). I parametri sono salvati nel DB e applicati ai test al caricamento.",
      "admin.save_button": "Salva",
      "admin.clear_button": "Svuota i punteggi",
      "admin.saved": "Parametri salvati ✔",
      "admin.cleared": "Punteggi eliminati ✔",
      "admin.confirm_clear": "Cancellare tutti i punteggi?",

      "admin.fields.prs_timeSpeed": "T3·timeSpeed (velocità globale)",
      "admin.fields.prs_duration": "T3·durata (ms)",
      "admin.fields.prs_captureRadius": "T3·raggio cattura (px)",
      "admin.fields.prs_jitterAmp": "T3·jitter",
      "admin.fields.bal_mode": "T4·modalità",
      "admin.fields.bal_duration": "T4·durata (ms)",
      "admin.fields.bal_low_good": "T4·soglia alta (100) (g)",
      "admin.fields.bal_high_bad": "T4·soglia bassa (0) (g)",
      "admin.fields.bal_mode.magnitude": "Magnitudo (incl. gravità)",
      "admin.fields.bal_mode.linear": "Accelerazione lineare"
    }
  };

  window.i18nDict = DICT;

  function getParam(name){
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get(name);
    } catch (e) {
      return null;
    }
  }

  function setParam(name, value){
    try {
      const url = new URL(window.location.href);
      if (value == null){
        url.searchParams.delete(name);
      } else {
        url.searchParams.set(name, value);
      }
      window.location.href = url.toString();
    } catch (e) {}
  }

  function normalizeLang(raw){
    const v = (raw || "").toLowerCase();
    return Object.prototype.hasOwnProperty.call(DICT, v) ? v : null;
  }

  function currentLang(){
    const fromQuery = normalizeLang(getParam('lang'));
    if (fromQuery) return fromQuery;
    const stored = normalizeLang(localStorage.getItem('jsd:lang'));
    if (stored) return stored;
    return 'fr';
  }

  let activeLang = currentLang();

  function translate(key, vars){
    vars = vars || {};
    const lang = activeLang || 'fr';
    const source = (DICT[lang] && DICT[lang][key]) || (DICT.fr && DICT.fr[key]) || key;
    return source.replace(/\{(\w+)\}/g, (_, name)=>{
      return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : `{${name}}`;
    });
  }

  function apply(){
    activeLang = currentLang();
    localStorage.setItem('jsd:lang', activeLang);
    document.documentElement.setAttribute('lang', activeLang);

    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = translate(key);
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el=>{
      const key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = translate(key);
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(el=>{
      const attrList = el.getAttribute('data-i18n-attr');
      if (!attrList) return;
      attrList.split(',').map(s=>s.trim()).filter(Boolean).forEach(pair=>{
        const [attr, key] = pair.split(':').map(s=>s.trim());
        if (attr && key) el.setAttribute(attr, translate(key));
      });
    });

    document.querySelectorAll('[data-i18n]').forEach(el=>{
      el.getAttributeNames().forEach(attrName=>{
        if (attrName.startsWith('data-i18n-attr-')){
          const key = el.getAttribute(attrName);
          const targetAttr = attrName.replace('data-i18n-attr-', '');
          if (targetAttr && key) el.setAttribute(targetAttr, translate(key));
        }
      });
    });

    const select = document.getElementById('langSelect');
    if (select){
      select.value = activeLang;
    }
  }

  function setup(){
    const select = document.getElementById('langSelect');
    if (select){
      select.innerHTML = Object.entries(LANG_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
      select.value = activeLang;
      select.addEventListener('change', ()=>{
        const nextLang = select.value;
        localStorage.setItem('jsd:lang', nextLang);
        setParam('lang', nextLang);
      });
    }
    apply();
  }

  window.addEventListener('DOMContentLoaded', setup);
  window.i18n = translate;
  window.i18nApply = apply;
  window.getCurrentLang = ()=>activeLang;
})();
