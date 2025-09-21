(function(){
  const LANG_LABELS = { fr: "FR", en: "EN", it: "IT" };
  const DICT = {
    fr: {
      "nav.theme_toggle": "Basculer le thème",
      "nav.leaderboard": "Top",
      "footer.tagline": "Reste en vibe, hydrate-toi et si ça tourne trop, appelle un taxi.",
      "footer.disclaimer": "Ce n'est pas un dispositif médical. Si tu as bu : ne conduis jamais. · Dev par JJC",

      "home.title": "Un check fun & sérieux pour savoir si tu dois poser le verre",
      "home.subtitle": "Anonyme, gratuit. Optimisé pour ton téléphone — si t'es bourré devant ton PC, on peut rien pour toi. Résultats indicatifs uniquement.",
      "home.list1": "4 mini-tests rapides (réaction, couleurs, poursuite, équilibre)",
      "home.list2": "Aucune donnée envoyée sans ton accord",
      "home.list3": "À la fin : ton score est enregistré automatiquement",
      "home.cta_start": "Commencer",
      "home.cta_leaderboard": "Voir le classement",
      "home.nickname_title": "Choisis ton surnom",
      "home.nickname_description": "Avant de commencer, choisis un surnom pour le classement.",
      "home.nickname_placeholder": "Ton meilleur blaze",
      "home.nickname_confirm": "C'est parti",
      "home.nickname_cancel": "Annuler",
      "home.nickname_error": "Choisis un surnom pour continuer.",
      "home.nickname_too_long": "Le surnom est trop long. Raccourcis-le pour continuer.",

      "t1.heading": "Test 1 · Réaction",
      "t1.notice": "Prêt·e ? Dès que le fond passe au VERT, tape plus vite que ton ombre. Si tu tires trop tôt, on recommence !",
      "t2.heading": "Test 2 · Stroop",
      "t2.notice": "Lis bien : clique sur la couleur affichée, pas sur le mot écrit. Même pompette, ton cerveau peut y arriver.",
      "t2.button_start": "Démarrer le test",
      "t3.heading": "Test 3 · Poursuite",
      "t3.notice": "Clique sur Démarrer : le cercle se met à bouger dans tous les sens, tu dois cliquer le plus vite possible dessus pour stopper sa progression. Attention tu n'as que {max_attempts} essais.",
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
      "t4.level_hint": "Garde la bulle au centre pendant la mesure.",
      "t4.motion_indicator_label": "Instabilité instantanée (σ)",
      "t4.motion_indicator_value": "σ ≈ {value} g",
      "t4.fallback_instruction": "Fallback : maintiens un doigt au centre du cercle pendant {seconds}s.",
      "t4.fallback_status_ready": "Pose ton doigt pour démarrer",
      "t4.fallback_status_running": "Mesure en cours…",
      "t4.fallback_status_short": "Mesure trop courte. Recommence.",
      "t4.fallback_status_done": "Terminé ✔",

      "results.heading": "Résultats",
      "results.total_label": "Score global",
      "results.summary_low": "Mais t'es carpet, pose tout de suite ton verre et va voir ta gueule dans un miroir",
      "results.summary_mid": "C'est pas mal, mais tu devrais t'arrêter là",
      "results.summary_high": "Wahou, tu mérites un autre verre pour ce score ! Mais un dernier hein !",
      "results.reaction_detail": "Réaction — Médiane : {median} ms · Moyenne : {mean} ms · Score {score}",
      "results.stroop_detail": "Stroop — Précision : {accuracy}% · RT : {rt} ms · Score {score}",
      "results.pursuit_detail_time": "Poursuite — Score {score} · Attrapé en {time} ms",
      "results.pursuit_detail_mean": "Poursuite — Score {score} · Erreur : {error} px",
      "results.pursuit_detail_base": "Poursuite — Score {score}",
      "results.balance_sensors_detail": "Équilibre (capteurs) — σ : {std} g · Score {score}",
      "results.balance_touch_detail": "Équilibre (tactile) — σ : {std} px · Score {score}",
      "results.balance_skipped": "Équilibre non mesuré (capteurs indisponibles). Score calculé sur les autres tests.",
      "results.auto_saved": "Score enregistré automatiquement ✔",
      "results.auto_saved_with": "Score enregistré automatiquement en tant que {nickname} ✔",
      "results.auto_saving": "Sauvegarde en cours…",
      "results.auto_save_retry": "Sauvegarde indisponible, nouvelle tentative…",
      "results.auto_save_preparing": "Préparation de la sauvegarde…",
      "results.share_button": "Partager",
      "results.share_success": "Partagé !",
      "results.share_copied": "Message copié !",
      "results.share_error": "Partage impossible.",
      "results.share_message": "Eh voici mon score sur https://JsuisDechire.com : {score}, tu peux faire mieux ?",

      "leaderboard.heading": "Classement",
      "leaderboard.rank": "#",
      "leaderboard.name": "Nom",
      "leaderboard.score": "Total",
      "leaderboard.reaction": "Réaction",
      "leaderboard.stroop": "Stroop",
      "leaderboard.pursuit": "Poursuite",
      "leaderboard.balance": "Équilibre",
      "reaction": "Réaction",
      "stroop": "Stroop",
      "pursuit": "Poursuite",
      "balance": "Équilibre",
      "leaderboard.date": "Date",
      "leaderboard.empty": "Aucun score pour l'instant.",

      "admin.heading": "Admin · Calibration",
      "admin.subtitle": "Protège cette page via ton reverse proxy (HTTP auth). Les paramètres sont stockés en base et appliqués aux tests au chargement.",
      "admin.save_button": "Enregistrer",
      "admin.clear_button": "Vider les scores",
      "admin.saved": "Paramètres enregistrés ✔",
      "admin.cleared": "Scores supprimés ✔",
      "admin.confirm_clear": "Supprimer tous les scores ?",
      "admin.groups.general.title": "Paramètres généraux",
      "admin.groups.general.description": "Définis les limites globales appliquées aux tests.",
      "admin.groups.reaction.title": "Test 1 · Réaction",
      "admin.groups.reaction.description": "Règle les essais et le timing d'apparition du vert.",
      "admin.groups.stroop.title": "Test 2 · Stroop",
      "admin.groups.stroop.description": "Ajuste le nombre de manches et l'équilibre précision/vitesse.",
      "admin.groups.pursuit.title": "Test 3 · Poursuite",
      "admin.groups.pursuit.description": "Règle la vitesse et la difficulté du cercle à attraper.",
      "admin.groups.balance.title": "Test 4 · Équilibre",
      "admin.groups.balance.description": "Paramètres pour les mesures gyroscope/accéléromètre.",
      "admin.groups.actions.title": "Actions globales",
      "admin.groups.actions.description": "Sauvegarde les paramètres ou purge les scores enregistrés.",
      "admin.fields.general.nickname_max_length": "Longueur max du surnom",
      "admin.fields.reaction.trials": "Nombre d'essais",
      "admin.fields.reaction.wait_min": "Attente minimum (ms)",
      "admin.fields.reaction.wait_range": "Aléa d'attente (ms)",
      "admin.fields.reaction.false_min": "Pénalité faux départ min (ms)",
      "admin.fields.reaction.false_range": "Aléa pénalité faux départ (ms)",
      "admin.fields.reaction.best": "Médiane score 100 (ms)",
      "admin.fields.reaction.worst": "Médiane score 0 (ms)",
      "admin.fields.stroop.rounds": "Nombre de manches",
      "admin.fields.stroop.acc_weight": "Poids précision",
      "admin.fields.stroop.speed_weight": "Poids vitesse",
      "admin.fields.stroop.best": "RT score 100 (ms)",
      "admin.fields.stroop.worst": "RT score 0 (ms)",
      "admin.fields.pursuit.speed": "Vitesse du cercle",
      "admin.fields.pursuit.duration": "Durée du test (ms)",
      "admin.fields.pursuit.capture": "Tolérance de capture (px)",
      "admin.fields.pursuit.jitter": "Aléa de trajectoire",
      "admin.fields.pursuit.max_attempts": "Essais ratés max",
      "admin.helpers.general.nickname_max_length": "Nombre maximal de caractères autorisés pour les surnoms.",
      "admin.helpers.reaction.trials": "Nombre de réactions prises en compte pour calculer le score.",
      "admin.helpers.reaction.wait_min": "Délai minimum avant que le vert s'affiche.",
      "admin.helpers.reaction.wait_range": "Variation aléatoire ajoutée au délai pour éviter l'anticipation.",
      "admin.helpers.reaction.false_min": "Temps ajouté en cas de clic trop tôt.",
      "admin.helpers.reaction.false_range": "Amplitude aléatoire de la pénalité de faux départ.",
      "admin.helpers.reaction.best": "Médiane visée pour obtenir 100 points.",
      "admin.helpers.reaction.worst": "Médiane au-delà de laquelle le score tombe à 0.",
      "admin.helpers.stroop.rounds": "Nombre de mots présentés pendant le test.",
      "admin.helpers.stroop.acc_weight": "Contribution de la précision dans le score final.",
      "admin.helpers.stroop.speed_weight": "Contribution du temps de réaction moyen.",
      "admin.helpers.stroop.best": "Temps moyen attendu pour 100 points côté vitesse.",
      "admin.helpers.stroop.worst": "Temps moyen à partir duquel la vitesse vaut 0 point.",
      "admin.helpers.pursuit.speed": "Multiplicateur appliqué à la trajectoire — plus la valeur est élevée, plus le cercle va vite.",
      "admin.helpers.pursuit.duration": "Temps total pendant lequel le cercle peut apparaître et se déplacer.",
      "admin.helpers.pursuit.capture": "Rayon autour du cercle qui valide le clic du joueur.",
      "admin.helpers.pursuit.jitter": "Amplitude du bruit aléatoire ajouté au mouvement pour casser les trajectoires trop prévisibles.",
      "admin.helpers.pursuit.max_attempts": "Nombre maximum de tentatives ratées avant d'attribuer 0 point.",
      "admin.fields.balance.mode": "Type de mesure",
      "admin.fields.balance.duration": "Durée de la capture (ms)",
      "admin.fields.balance.low_good": "Écart-type pour 100 points (g)",
      "admin.fields.balance.high_bad": "Écart-type pour 0 point (g)",
      "admin.fields.balance.rel_tol": "Tolérance relative linéaire",
      "admin.fields.balance.mode.magnitude": "Magnitude (avec gravité)",
      "admin.fields.balance.mode.linear": "Accélération linéaire (sans gravité)",
      "admin.helpers.balance.mode": "Choisis la composante du capteur utilisée pour le score.",
      "admin.helpers.balance.duration": "Temps d'enregistrement des capteurs pendant lequel l'utilisateur doit rester immobile.",
      "admin.helpers.balance.low_good": "Écart-type attendu pour attribuer 100 points.",
      "admin.helpers.balance.high_bad": "Écart-type qui donnera 0 point.",
      "admin.helpers.balance.rel_tol": "Marge utilisée pour lisser le calcul lorsque le mode linéaire est actif.",

      "admin.fields.prs_timeSpeed": "T3·timeSpeed (vitesse globale)",
      "admin.fields.prs_duration": "T3·durée (ms)",
      "admin.fields.prs_captureRadius": "T3·rayon capture (px)",
      "admin.fields.prs_jitterAmp": "T3·jitter",
      "admin.fields.prs_max_attempts": "T3·essais ratés max",
      "admin.fields.bal_mode": "T4·mode",
      "admin.fields.bal_duration": "T4·durée (ms)",
      "admin.fields.bal_low_good": "T4·σ pour score 100 (g)",
      "admin.fields.bal_high_bad": "T4·σ pour score 0 (g)",
      "admin.fields.bal_lin_rel_tol": "T4·tolérance rel. linéaire",
      "admin.fields.bal_mode.magnitude": "Magnitude (incl. gravité)",
      "admin.fields.bal_mode.linear": "Accélération linéaire"
    },
    en: {
      "nav.theme_toggle": "Toggle theme",
      "nav.leaderboard": "Leaderboard",
      "footer.tagline": "Stay in the vibe, hydrate, and if things start spinning, call a cab.",
      "footer.disclaimer": "This is not a medical device. If you drank: never drive. · Dev by JJC",

      "home.title": "A fun & serious check to know if you should put the glass down",
      "home.subtitle": "Anonymous, free. Optimized for your phone — if you're drunk at your PC, we can't help you. Results are for guidance only.",
      "home.list1": "4 quick mini-tests (reaction, colors, pursuit, balance)",
      "home.list2": "No data sent without your consent",
      "home.list3": "At the end: your score is saved automatically",
      "home.cta_start": "Start",
      "home.cta_leaderboard": "See the leaderboard",
      "home.nickname_title": "Pick your nickname",
      "home.nickname_description": "Before we begin, choose a nickname for the leaderboard.",
      "home.nickname_placeholder": "Your best alias",
      "home.nickname_confirm": "Let's go",
      "home.nickname_cancel": "Cancel",
      "home.nickname_error": "Choose a nickname to continue.",
      "home.nickname_too_long": "Nickname is too long. Shorten it to continue.",

      "t1.heading": "Test 1 · Reaction",
      "t1.notice": "Ready? As soon as the background turns GREEN, tap faster than your shadow. Jumping the gun means a redo.",
      "t2.heading": "Test 2 · Stroop",
      "t2.notice": "Read carefully: click the ink color, not the word you read. Even tipsy, your brain can handle it.",
      "t2.button_start": "Start the test",
      "t3.heading": "Test 3 · Pursuit",
      "t3.notice": "Hit Start and the circle will dart in every direction. Click it as fast as you can to stop its run. Careful—you only get {max_attempts} tries.",
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
      "t4.level_hint": "Keep the bubble centered while you measure.",
      "t4.motion_indicator_label": "Live stability (σ)",
      "t4.motion_indicator_value": "σ ≈ {value} g",
      "t4.fallback_instruction": "Fallback: keep one finger in the center of the circle for {seconds}s.",
      "t4.fallback_status_ready": "Place your finger to start",
      "t4.fallback_status_running": "Measuring…",
      "t4.fallback_status_short": "Measurement too short. Try again.",
      "t4.fallback_status_done": "Done ✔",

      "results.heading": "Results",
      "results.total_label": "Overall score",
      "results.summary_low": "You're totally wasted, drop your glass right now and take a good look in the mirror",
      "results.summary_mid": "Not bad, but you should call it a night now",
      "results.summary_high": "Wow, you deserve another drink for that score—but make it the last one!",
      "results.reaction_detail": "Reaction — Median: {median} ms · Mean: {mean} ms · Score {score}",
      "results.stroop_detail": "Stroop — Accuracy: {accuracy}% · RT: {rt} ms · Score {score}",
      "results.pursuit_detail_time": "Pursuit — Score {score} · Caught in {time} ms",
      "results.pursuit_detail_mean": "Pursuit — Score {score} · Error: {error} px",
      "results.pursuit_detail_base": "Pursuit — Score {score}",
      "results.balance_sensors_detail": "Balance (sensors) — σ: {std} g · Score {score}",
      "results.balance_touch_detail": "Balance (touch) — σ: {std} px · Score {score}",
      "results.balance_skipped": "Balance not measured (sensors unavailable). Score computed from the other tests.",
      "results.auto_saved": "Score saved automatically ✔",
      "results.auto_saved_with": "Score saved automatically as {nickname} ✔",
      "results.auto_saving": "Saving in progress…",
      "results.auto_save_retry": "Save unavailable, retrying…",
      "results.auto_save_preparing": "Preparing save…",
      "results.share_button": "Share",
      "results.share_success": "Shared!",
      "results.share_copied": "Message copied!",
      "results.share_error": "Share failed.",
      "results.share_message": "Hey, here's my score on https://JsuisDechire.com: {score}. Think you can beat it?",

      "leaderboard.heading": "Leaderboard",
      "leaderboard.rank": "#",
      "leaderboard.name": "Name",
      "leaderboard.score": "Total",
      "leaderboard.reaction": "Reaction",
      "leaderboard.stroop": "Stroop",
      "leaderboard.pursuit": "Pursuit",
      "leaderboard.balance": "Balance",
      "reaction": "Reaction",
      "stroop": "Stroop",
      "pursuit": "Pursuit",
      "balance": "Balance",
      "leaderboard.date": "Date",
      "leaderboard.empty": "No score yet.",

      "admin.heading": "Admin · Calibration",
      "admin.subtitle": "Protect this page through your reverse proxy (HTTP auth). Settings are stored in DB and applied to tests on load.",
      "admin.save_button": "Save",
      "admin.clear_button": "Clear scores",
      "admin.saved": "Settings saved ✔",
      "admin.cleared": "Scores cleared ✔",
      "admin.confirm_clear": "Delete all scores?",
      "admin.groups.general.title": "General settings",
      "admin.groups.general.description": "Set the global limits applied across the tests.",
      "admin.groups.reaction.title": "Test 1 · Reaction",
      "admin.groups.reaction.description": "Tune the trials and timing for the green light.",
      "admin.groups.stroop.title": "Test 2 · Stroop",
      "admin.groups.stroop.description": "Adjust the number of rounds and the accuracy/speed balance.",
      "admin.groups.pursuit.title": "Test 3 · Pursuit",
      "admin.groups.pursuit.description": "Adjust how fast and tricky the target is to catch.",
      "admin.groups.balance.title": "Test 4 · Balance",
      "admin.groups.balance.description": "Tune the gyroscope / accelerometer capture used for the score.",
      "admin.groups.actions.title": "Global actions",
      "admin.groups.actions.description": "Save the calibration or wipe the saved scores.",
      "admin.fields.general.nickname_max_length": "Nickname max length",
      "admin.fields.reaction.trials": "Number of trials",
      "admin.fields.reaction.wait_min": "Minimum wait (ms)",
      "admin.fields.reaction.wait_range": "Wait randomness (ms)",
      "admin.fields.reaction.false_min": "False start penalty min (ms)",
      "admin.fields.reaction.false_range": "False start penalty range (ms)",
      "admin.fields.reaction.best": "Median for 100 pts (ms)",
      "admin.fields.reaction.worst": "Median for 0 pt (ms)",
      "admin.fields.stroop.rounds": "Number of rounds",
      "admin.fields.stroop.acc_weight": "Accuracy weight",
      "admin.fields.stroop.speed_weight": "Speed weight",
      "admin.fields.stroop.best": "RT for 100 pts (ms)",
      "admin.fields.stroop.worst": "RT for 0 pt (ms)",
      "admin.fields.pursuit.speed": "Target speed",
      "admin.fields.pursuit.duration": "Test duration (ms)",
      "admin.fields.pursuit.capture": "Capture tolerance (px)",
      "admin.fields.pursuit.jitter": "Path randomness",
      "admin.fields.pursuit.max_attempts": "Max failed attempts",
      "admin.helpers.general.nickname_max_length": "Maximum number of characters allowed for nicknames.",
      "admin.helpers.reaction.trials": "How many reactions are used to compute the score.",
      "admin.helpers.reaction.wait_min": "Minimum delay before the green signal appears.",
      "admin.helpers.reaction.wait_range": "Random variation added to the delay to avoid anticipation.",
      "admin.helpers.reaction.false_min": "Time added when the player taps too early.",
      "admin.helpers.reaction.false_range": "Extra randomness applied to the false start penalty.",
      "admin.helpers.reaction.best": "Median reaction time that grants 100 points.",
      "admin.helpers.reaction.worst": "Median reaction time that drops the score to 0.",
      "admin.helpers.stroop.rounds": "How many words are shown during the test.",
      "admin.helpers.stroop.acc_weight": "Weight of accuracy in the final score.",
      "admin.helpers.stroop.speed_weight": "Weight of the average reaction time.",
      "admin.helpers.stroop.best": "Average reaction time rewarded with 100 points.",
      "admin.helpers.stroop.worst": "Average reaction time that yields 0 points for speed.",
      "admin.helpers.pursuit.speed": "Multiplier applied to the path — higher values make the target move faster.",
      "admin.helpers.pursuit.duration": "Total amount of time during which the target can appear and move.",
      "admin.helpers.pursuit.capture": "Radius around the target that validates a tap or click.",
      "admin.helpers.pursuit.jitter": "Amount of noise added to the movement to avoid predictable trajectories.",
      "admin.helpers.pursuit.max_attempts": "Maximum number of failed tries before the score drops to 0.",
      "admin.fields.balance.mode": "Measurement type",
      "admin.fields.balance.duration": "Capture duration (ms)",
      "admin.fields.balance.low_good": "Std dev for 100 pts (g)",
      "admin.fields.balance.high_bad": "Std dev for 0 pt (g)",
      "admin.fields.balance.rel_tol": "Linear relative tolerance",
      "admin.fields.balance.mode.magnitude": "Magnitude (with gravity)",
      "admin.fields.balance.mode.linear": "Linear acceleration (gravity removed)",
      "admin.helpers.balance.mode": "Choose the sensor component used for scoring.",
      "admin.helpers.balance.duration": "Time during which the sensors are recorded while the user stays still.",
      "admin.helpers.balance.low_good": "Expected standard deviation to award 100 points.",
      "admin.helpers.balance.high_bad": "Standard deviation that will give 0 points.",
      "admin.helpers.balance.rel_tol": "Extra margin used to smooth the score when linear mode is active.",

      "admin.fields.prs_timeSpeed": "T3·timeSpeed (global speed)",
      "admin.fields.prs_duration": "T3·duration (ms)",
      "admin.fields.prs_captureRadius": "T3·capture radius (px)",
      "admin.fields.prs_jitterAmp": "T3·jitter",
      "admin.fields.prs_max_attempts": "T3·max failed attempts",
      "admin.fields.bal_mode": "T4·mode",
      "admin.fields.bal_duration": "T4·duration (ms)",
      "admin.fields.bal_low_good": "T4·σ for score 100 (g)",
      "admin.fields.bal_high_bad": "T4·σ for score 0 (g)",
      "admin.fields.bal_lin_rel_tol": "T4·linear rel. tolerance",
      "admin.fields.bal_mode.magnitude": "Magnitude (incl. gravity)",
      "admin.fields.bal_mode.linear": "Linear acceleration"
    },
    it: {
      "nav.theme_toggle": "Cambia tema",
      "nav.leaderboard": "Classifica",
      "footer.tagline": "Resta nel mood, idratati e se tutto gira troppo, chiama un taxi.",
      "footer.disclaimer": "Non è un dispositivo medico. Se hai bevuto: non guidare mai. · Dev da JJC",

      "home.title": "Un check divertente e serio per capire se devi posare il bicchiere",
      "home.subtitle": "Anonimo, gratuito. Ottimizzato per il tuo telefono — se sei sbronzo davanti al PC, non possiamo aiutarti. Risultati solo indicativi.",
      "home.list1": "4 mini-test rapidi (reazione, colori, inseguimento, equilibrio)",
      "home.list2": "Nessun dato inviato senza il tuo consenso",
      "home.list3": "Alla fine: il punteggio viene salvato automaticamente",
      "home.cta_start": "Inizia",
      "home.cta_leaderboard": "Vedi la classifica",
      "home.nickname_title": "Scegli il tuo soprannome",
      "home.nickname_description": "Prima di iniziare, scegli un soprannome per la classifica.",
      "home.nickname_placeholder": "Il tuo miglior alias",
      "home.nickname_confirm": "Si parte",
      "home.nickname_cancel": "Annulla",
      "home.nickname_error": "Scegli un soprannome per continuare.",
      "home.nickname_too_long": "Il soprannome è troppo lungo. Accorcialo per continuare.",

      "t1.heading": "Test 1 · Reazione",
      "t1.notice": "Prontə? Quando lo sfondo diventa VERDE, tocca più veloce della tua ombra. Se parti in anticipo, si ricomincia!",
      "t2.heading": "Test 2 · Stroop",
      "t2.notice": "Leggi bene: clicca sul colore che vedi, non sul nome scritto. Anche con qualche drink, il cervello ce la può fare.",
      "t2.button_start": "Avvia il test",
      "t3.heading": "Test 3 · Inseguimento",
      "t3.notice": "Premi Avvia: il cerchio inizia a muoversi in ogni direzione, devi cliccarlo al volo per fermarlo. Attenzione, hai solo {max_attempts} tentativi.",
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
      "t4.level_hint": "Tieni la bolla al centro durante la misura.",
      "t4.motion_indicator_label": "Stabilità istantanea (σ)",
      "t4.motion_indicator_value": "σ ≈ {value} g",
      "t4.fallback_instruction": "Fallback: tieni un dito al centro del cerchio per {seconds}s.",
      "t4.fallback_status_ready": "Metti il dito per iniziare",
      "t4.fallback_status_running": "Misurazione in corso…",
      "t4.fallback_status_short": "Misurazione troppo breve. Riprova.",
      "t4.fallback_status_done": "Finito ✔",

      "results.heading": "Risultati",
      "results.total_label": "Punteggio globale",
      "results.summary_low": "Sei stesə, posa subito il bicchiere e vai a guardarti allo specchio",
      "results.summary_mid": "Niente male, ma dovresti fermarti qui",
      "results.summary_high": "Wow, ti meriti un altro drink per questo punteggio… ma che sia l'ultimo!",
      "results.reaction_detail": "Reazione — Mediana: {median} ms · Media: {mean} ms · Punteggio {score}",
      "results.stroop_detail": "Stroop — Precisione: {accuracy}% · RT: {rt} ms · Punteggio {score}",
      "results.pursuit_detail_time": "Inseguimento — Punteggio {score} · Preso in {time} ms",
      "results.pursuit_detail_mean": "Inseguimento — Punteggio {score} · Errore: {error} px",
      "results.pursuit_detail_base": "Inseguimento — Punteggio {score}",
      "results.balance_sensors_detail": "Equilibrio (sensori) — σ: {std} g · Punteggio {score}",
      "results.balance_touch_detail": "Equilibrio (touch) — σ: {std} px · Punteggio {score}",
      "results.balance_skipped": "Equilibrio non misurato (sensori non disponibili). Punteggio calcolato sugli altri test.",
      "results.auto_saved": "Punteggio salvato automaticamente ✔",
      "results.auto_saved_with": "Punteggio salvato automaticamente come {nickname} ✔",
      "results.auto_saving": "Salvataggio in corso…",
      "results.auto_save_retry": "Salvataggio non disponibile, nuovo tentativo…",
      "results.auto_save_preparing": "Preparazione del salvataggio…",
      "results.share_button": "Condividi",
      "results.share_success": "Condiviso!",
      "results.share_copied": "Messaggio copiato!",
      "results.share_error": "Condivisione non riuscita.",
      "results.share_message": "Ehi, ecco il mio punteggio su https://JsuisDechire.com: {score}, sai fare di meglio?",

      "leaderboard.heading": "Classifica",
      "leaderboard.rank": "#",
      "leaderboard.name": "Nome",
      "leaderboard.score": "Totale",
      "leaderboard.reaction": "Reazione",
      "leaderboard.stroop": "Stroop",
      "leaderboard.pursuit": "Inseguimento",
      "leaderboard.balance": "Equilibrio",
      "reaction": "Reazione",
      "stroop": "Stroop",
      "pursuit": "Inseguimento",
      "balance": "Equilibrio",
      "leaderboard.date": "Data",
      "leaderboard.empty": "Nessun punteggio per ora.",

      "admin.heading": "Admin · Calibrazione",
      "admin.subtitle": "Proteggi questa pagina tramite il tuo reverse proxy (autenticazione HTTP). I parametri sono salvati nel DB e applicati ai test al caricamento.",
      "admin.save_button": "Salva",
      "admin.clear_button": "Svuota i punteggi",
      "admin.saved": "Parametri salvati ✔",
      "admin.cleared": "Punteggi eliminati ✔",
      "admin.confirm_clear": "Cancellare tutti i punteggi?",
      "admin.groups.general.title": "Impostazioni generali",
      "admin.groups.general.description": "Definisci i limiti globali applicati ai test.",
      "admin.groups.reaction.title": "Test 1 · Reazione",
      "admin.groups.reaction.description": "Regola i tentativi e il tempo di accensione del verde.",
      "admin.groups.stroop.title": "Test 2 · Stroop",
      "admin.groups.stroop.description": "Personalizza il numero di round e il bilanciamento precisione/velocità.",
      "admin.groups.pursuit.title": "Test 3 · Inseguimento",
      "admin.groups.pursuit.description": "Regola la velocità e la difficoltà del bersaglio da catturare.",
      "admin.groups.balance.title": "Test 4 · Equilibrio",
      "admin.groups.balance.description": "Imposta la raccolta del giroscopio / accelerometro usata per il punteggio.",
      "admin.groups.actions.title": "Azioni globali",
      "admin.groups.actions.description": "Salva la calibrazione o svuota i punteggi memorizzati.",
      "admin.fields.general.nickname_max_length": "Lunghezza max soprannome",
      "admin.fields.reaction.trials": "Numero di prove",
      "admin.fields.reaction.wait_min": "Attesa minima (ms)",
      "admin.fields.reaction.wait_range": "Variazione attesa (ms)",
      "admin.fields.reaction.false_min": "Penalità falsa partenza min (ms)",
      "admin.fields.reaction.false_range": "Variazione penalità falsa partenza (ms)",
      "admin.fields.reaction.best": "Mediana punteggio 100 (ms)",
      "admin.fields.reaction.worst": "Mediana punteggio 0 (ms)",
      "admin.fields.stroop.rounds": "Numero di round",
      "admin.fields.stroop.acc_weight": "Peso precisione",
      "admin.fields.stroop.speed_weight": "Peso velocità",
      "admin.fields.stroop.best": "RT punteggio 100 (ms)",
      "admin.fields.stroop.worst": "RT punteggio 0 (ms)",
      "admin.fields.pursuit.speed": "Velocità del bersaglio",
      "admin.fields.pursuit.duration": "Durata del test (ms)",
      "admin.fields.pursuit.capture": "Tolleranza di cattura (px)",
      "admin.fields.pursuit.jitter": "Casualità della traiettoria",
      "admin.fields.pursuit.max_attempts": "Tentativi falliti max",
      "admin.helpers.general.nickname_max_length": "Numero massimo di caratteri consentiti per i soprannomi.",
      "admin.helpers.reaction.trials": "Numero di reazioni considerate per calcolare il punteggio.",
      "admin.helpers.reaction.wait_min": "Ritardo minimo prima che appaia il verde.",
      "admin.helpers.reaction.wait_range": "Variazione casuale aggiunta al ritardo per evitare l'anticipo.",
      "admin.helpers.reaction.false_min": "Tempo aggiunto in caso di tocco troppo presto.",
      "admin.helpers.reaction.false_range": "Ampiezza casuale della penalità per falsa partenza.",
      "admin.helpers.reaction.best": "Mediana prevista per ottenere 100 punti.",
      "admin.helpers.reaction.worst": "Mediana oltre la quale il punteggio scende a 0.",
      "admin.helpers.stroop.rounds": "Quanti vocaboli vengono mostrati durante il test.",
      "admin.helpers.stroop.acc_weight": "Peso della precisione nel punteggio finale.",
      "admin.helpers.stroop.speed_weight": "Peso del tempo di reazione medio.",
      "admin.helpers.stroop.best": "Tempo medio premiato con 100 punti lato velocità.",
      "admin.helpers.stroop.worst": "Tempo medio oltre il quale la velocità vale 0 punti.",
      "admin.helpers.pursuit.speed": "Moltiplicatore applicato al percorso: più alto è il valore, più rapido si muove il bersaglio.",
      "admin.helpers.pursuit.duration": "Tempo totale durante il quale il bersaglio può apparire e muoversi.",
      "admin.helpers.pursuit.capture": "Raggio attorno al bersaglio che convalida il tocco o il clic.",
      "admin.helpers.pursuit.jitter": "Quantità di rumore aggiunta al movimento per evitare percorsi prevedibili.",
      "admin.helpers.pursuit.max_attempts": "Numero massimo di tentativi falliti prima di assegnare 0 punti.",
      "admin.fields.balance.mode": "Tipo di misura",
      "admin.fields.balance.duration": "Durata della cattura (ms)",
      "admin.fields.balance.low_good": "Deviazione std per 100 pt (g)",
      "admin.fields.balance.high_bad": "Deviazione std per 0 pt (g)",
      "admin.fields.balance.rel_tol": "Tolleranza relativa lineare",
      "admin.fields.balance.mode.magnitude": "Magnitudo (con gravità)",
      "admin.fields.balance.mode.linear": "Accelerazione lineare (senza gravità)",
      "admin.helpers.balance.mode": "Scegli la componente del sensore utilizzata per il punteggio.",
      "admin.helpers.balance.duration": "Tempo di registrazione dei sensori durante il quale l'utente deve restare fermo.",
      "admin.helpers.balance.low_good": "Deviazione standard attesa per assegnare 100 punti.",
      "admin.helpers.balance.high_bad": "Deviazione standard che assegnerà 0 punti.",
      "admin.helpers.balance.rel_tol": "Margine extra utilizzato per ammorbidire il punteggio quando è attivo il modo lineare.",

      "admin.fields.prs_timeSpeed": "T3·timeSpeed (velocità globale)",
      "admin.fields.prs_duration": "T3·durata (ms)",
      "admin.fields.prs_captureRadius": "T3·raggio cattura (px)",
      "admin.fields.prs_jitterAmp": "T3·jitter",
      "admin.fields.prs_max_attempts": "T3·tentativi falliti max",
      "admin.fields.bal_mode": "T4·modalità",
      "admin.fields.bal_duration": "T4·durata (ms)",
      "admin.fields.bal_low_good": "T4·σ per punteggio 100 (g)",
      "admin.fields.bal_high_bad": "T4·σ per punteggio 0 (g)",
      "admin.fields.bal_lin_rel_tol": "T4·tolleranza rel. lineare",
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

  function extractParams(el){
    const params = {};
    let hasParams = false;
    el.getAttributeNames().forEach(attrName=>{
      if (!attrName.startsWith('data-i18n-param-')) return;
      const paramName = attrName.slice('data-i18n-param-'.length);
      if (!paramName) return;
      params[paramName] = el.getAttribute(attrName);
      hasParams = true;
    });
    return hasParams ? params : null;
  }

  function apply(){
    activeLang = currentLang();
    localStorage.setItem('jsd:lang', activeLang);
    document.documentElement.setAttribute('lang', activeLang);

    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const params = extractParams(el);
      el.textContent = translate(key, params || undefined);
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
