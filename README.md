<h1 align="center">🍹 jsuisdechire · Mini-jeux pour savoir si tu es (un peu trop) déchiré·e</h1>

<p align="center">
  <strong><a href="#-francais">🇫🇷 Français</a> · <a href="#-english">🇬🇧 English</a> · <a href="#-italiano">🇮🇹 Italiano</a></strong>
</p>

> Audit technique et UX du 12 septembre 2026 : [AUDIT.md](AUDIT.md)

---

## 🇫🇷 Français

### 🍸 Aperçu
**jsuisdechire** est une web app Flask pleine de paillettes pour vérifier ton état après l'apéro. Tu enchaînes jusqu'à onze mini-jeux (réaction, couleurs, poursuite, équilibre, mémoire, où est la balle ?, conduite, tir au gobelet, glaçon fou, barman précis et Dino Dash), tu obtiens un score façon "soirée entre potes", et tu peux grimper sur le leaderboard si tu assures. Fun garanti, mais rappel : ce n'est PAS un dispositif médical.

### ✨ Fonctionnalités
- **11 tests rapides** :
  - 🟢 *Réaction (t1)* – Tape dès que ça passe au vert, ton temps médian devient ton score.
  - 🌈 *Couleurs (t2)* – Version Stroop : clique la vraie couleur, pas le mot, vitesse + précision.
  - 🎯 *Poursuite (t3)* – Attrape une cible qui virevolte; précision ou temps de capture.
  - ⚖️ *Équilibre (t4)* – Utilise les capteurs du téléphone pour mesurer ta stabilité.
  - 🥤 *Réflexe gobelet (t6)* – Ajuste l’angle et la puissance pour faire entrer la balle dans le gobelet.
  - 🚗 *Conduite sobre (t7)* – Change de voie et évite les obstacles sans multiplier les collisions.
  - 🧠 *Mémoire (t5)* – Retrouve les séquences en limitant les erreurs et le temps de réponse.
  - 🧊 *Glaçon fou (t9)* – Attrape les glaçons qui tombent et évite les fruits/pièges en gardant ton combo.
  - 🍸 *Barman précis (t10)* – Incline ton téléphone pour guider un verre, attraper les glaçons et éviter les éclaboussures.
  - 🦖 *Dino Dash (t11)* – Tiens ton téléphone en main et saute réellement pour faire bondir le dino au-dessus des cactus.
- **Parties personnalisables** : si l'option est activée dans l'admin, le joueur choisit les mini-jeux de sa partie depuis une grille mobile illustrée ; la carte cartoon aléatoire est identifiée comme carte 01.
- **Mode entraînement** (`/training`) : le joueur peut tester n'importe quel mini-jeu avant une vraie partie. Les jeux désactivés restent accessibles avec un badge « bêta » et ne sont pas proposés dans les parties officielles.
- **Dernier score supprimable** : les joueurs connectés peuvent retirer leur dernier score enregistré depuis les résultats ou leur profil, dans la limite quotidienne configurable par l'administration (3 suppressions par défaut).
- **Tableaux compacts** : le classement global et l'historique du profil affichent les 11 mini-jeux avec des en-têtes verticaux pour conserver une largeur lisible.
- **Résultats stylés** avec résumé, détails par test et bouton de partage.
- **Parcours fluide** : une épreuve terminée ne peut pas être rejouée accidentellement ; la partie continue vers le mini-jeu suivant ou le score final.
- **Avis facultatifs** : après le score final, le joueur peut ouvrir un formulaire mobile pour noter chaque mini-jeu joué sur 5 étoiles et qualifier sa difficulté, avec rappel du score obtenu.
- **Mini-jeux cartoon** : Réaction utilise un vrai bouton orange/vert à presser, tandis que Stroop transforme les cartes de peinture en boutons de couleur tactiles.
- **Classement public** (`/leaderboard`) avec sauvegarde automatique après chaque run.
- **Panneau admin** (`/admin`) pour configurer les paramètres ou purger la base.
- **Mode hors-ligne léger** grâce au service worker et aux assets versionnés.
- **I18n dynamique** (via `static/js/i18n.js`) + thème clair/sombre 🎚️.

### 🛠️ Stack & architecture
- **Backend** : Flask + SQLite (`data.sqlite`).
- **Frontend** : Templates Jinja + Tailwind CSS compilé localement + JavaScript vanilla.
- **Service worker** : route `/sw.js`, rendu depuis `templates/sw.js`.
- **Gestion des paramètres** : `/api/settings` (lecture), `/api/admin/*` (écriture, scores, purge).
- **Stockage local** : `localStorage` pour l'état de session et les scores avant soumission.

```
📁 jsuisdechire/
├── app.py              # Routes Flask + API + admin + scoring
├── templates/          # Pages (home, sélection, t1..t11, leaderboard, admin, JJ HUB, etc.)
├── static/js/          # Logique front (tests, session, i18n, résultats)
├── static/css/         # Feuille Tailwind compilée et source
├── static/branding/    # Logos, pictogrammes et visuels de sélection des jeux
├── static/icons/       # PWA icons & manifest
├── deploy.sh           # Déploiement SSH reproductible
└── data.sqlite         # Créé automatiquement au lancement
```

### 🚀 Installation & lancement
```bash
python -m venv .venv
source .venv/bin/activate  # Windows : .venv\Scripts\activate
pip install flask werkzeug standard-imghdr
npm install
npm run build:css
export FLASK_ENV=development  # optionnel pour le debug
python app.py  # démarre sur 0.0.0.0:9001
```

- Le paquet `standard-imghdr` fournit le module `imghdr`, retiré de la bibliothèque standard depuis Python 3.13, afin d'éviter les `ModuleNotFoundError` sur Debian 13.
- L'application écoute sur `http://localhost:9001`.
- La base SQLite (`data.sqlite`) est créée automatiquement.
- Variables utiles :
  - `SECRET_KEY` (clé de session Flask) – obligatoire en production ; une clé temporaire est générée uniquement en développement.
  - `GOOGLE_ANALYTICS_ID` (identifiant de mesure GA4 au format `G-XXXXXXXXXX`) – active GA4 avec Consent Mode v2 : refus par défaut dans l’EEE, au Royaume-Uni et en Suisse, autorisation par défaut ailleurs ; laissé vide, le suivi reste désactivé.
- `ASSET_VERSION` pour invalider le cache des assets statiques.

Sécurité opérationnelle : les tentatives de connexion, d'inscription et de récupération de mot de passe sont limitées par adresse cliente. Une mise à jour de mot de passe déconnecte les autres sessions du compte ; un changement du mot de passe admin révoque les autres sessions d'administration. Les 200 derniers événements sensibles peuvent être consultés par un administrateur via `/api/admin/security-audit` (sans mot de passe, secret SMTP ni adresse IP en clair).

Contrôles avant livraison :

```bash
python -m unittest discover -s tests -v
npm run test:js
```

### 🚚 Déploiement

Le déploiement de production est automatisé par [`deploy.sh`](deploy.sh). Le script utilise par défaut `toxyk@192.168.1.30`, `/opt/jsuisdechire/app` et le service systemd `jsuisdechire`.

```bash
./deploy.sh
```

Les paramètres peuvent être placés dans un fichier local `.env.deploy` non versionné, ou surchargés ponctuellement :

```bash
REMOTE_HOST=192.168.1.30 RUN_HTTP_CHECKS=0 ./deploy.sh
```

Le script exclut la base SQLite, les secrets, l’environnement virtuel et les uploads locaux de l’archive ; il sauvegarde l’installation distante avant copie, crée en plus une copie dédiée de `data.sqlite`, installe uniquement les fichiers applicatifs, crée une clé de session de production si nécessaire, redémarre le service et contrôle les routes principales ainsi que les nouveaux assets de marque. Il ne supprime ni ne remplace jamais la base de production. Pour provisionner les identifiants admin sur le serveur malgré l’exclusion de `data.sqlite`, définis `ADMIN_LOGIN` et `ADMIN_PASSWORD` dans `.env.deploy` : le mot de passe est envoyé uniquement sous forme de hash et écrit dans la base distante pendant le déploiement.

### Règle impérative après un déploiement

Copier `app.py` et les templates sur le serveur ne suffit pas : Gunicorn conserve le code en mémoire jusqu’à son redémarrage. Un déploiement n’est valide que si `systemctl daemon-reload`, puis `systemctl restart jsuisdechire`, ont réellement remplacé le PID principal. `deploy.sh` contrôle désormais ce remplacement et échoue si le PID est identique. Vérifie aussi que `https://jsuisdechire.com/sw.js` contient la nouvelle version avant de conclure à un défaut de navigateur/PWA ; une ancienne version du worker pouvait réafficher une page anonyme après connexion.

### Règle impérative — Beer Pong (t8)

Le Beer Pong est composé de deux éléments **indépendants et validés ensemble** : `static/js/t8.js` contient le jeu et le gobelet rouge ; `static/js/t8-aim.js` contient exclusivement le lanceur circulaire, la barre de visée et le geste de lance-pierre. `templates/t8.html` doit charger les deux scripts, dans cet ordre : `t8.js`, puis `t8-aim.js`.

Ne jamais recopier le gobelet depuis un autre mini-jeu, ne jamais réécrire la physique du lanceur « à l’œil », et ne jamais retirer `t8-aim.js` pour une modification visuelle. Si une régression est signalée, restaurer le composant concerné depuis Git, sans toucher à l’autre composant. Avant tout déploiement t8, vérifier la syntaxe avec `npm run test:js`, puis vérifier manuellement sur ordinateur et mobile : le grand cercle est centré sur la balle, la barre de visée est visible, le glissement lance la balle dans le bon sens et le gobelet rouge reste inchangé.

### 👩‍💻 Admin & scores
- Accès admin : `/admin` (utiliser un login et un mot de passe uniques ; aucun mot de passe par défaut n’est accepté).
- La page des paramètres est organisée en onglets : partie & expérience, mini-jeux, compte & email, retours joueurs et édition des scores. Dans « Sélection des jeux », les mini-jeux se gèrent avec la même grille de cartes cartoon que côté joueur : clic pour activer/désactiver, coche verte et compteur des jeux actifs. Les mini-jeux disposent aussi d’un second niveau de navigation pour n’afficher qu’un panneau de calibration à la fois, sans retirer aucune option.
- Tu peux modifier login/mot de passe, purger les scores depuis l’éditeur dédié, ajuster les paramètres de chaque test, activer le choix des jeux par le joueur, lancer chaque mini-jeu en aperçu avec les valeurs non sauvegardées, valider les réglages avant sauvegarde et diagnostiquer ou tester l’envoi SMTP vers une adresse choisie.
- Les actions globales restent en bas de page, sans barre flottante persistante sur mobile. La suppression des scores demande une modale intégrée au thème et la saisie obligatoire de « EFFACER » avant validation.
- Le panneau admin inclut aussi les retours joueurs : synthèse par mini-jeu, moyenne d’étoiles, tendance de difficulté, recommandation d’ajustement et tableau détaillé triable/filtrable, regroupé sur une ligne par votant avec login et date.
- Chaque vote peut être supprimé individuellement. Les cartes affichent aussi la moyenne globale du score du jeu et son taux de présence parmi toutes les parties, chacun avec sa barre de progression.
- Toutes les confirmations sensibles de l’admin utilisent des modales cohérentes avec le thème clair/sombre ; aucune boîte de dialogue native du navigateur n’est utilisée.
- Le réglage « Activer les évaluations joueurs » permet de masquer le formulaire et de désactiver la réception des votes.
- Le mot de passe SMTP n’est jamais injecté dans le HTML de l’admin ; un champ vide conserve le secret existant.
- Les résultats envoyés via `/api/submit` stockent : score total, détails par épreuve, timestamp et pseudo.
- Le réglage `player_score_deletions_per_day` contrôle le nombre de suppressions du dernier score autorisées par compte et par jour ; la valeur `0` désactive la fonctionnalité.
- Les avis sont disponibles via `/api/admin/feedback` pour les administrateurs et les votes joueurs sont reçus par `/api/feedback`.

### 🎨 Personnalisation rapide
- Ajuste les durées, seuils et poids dans `DEFAULT_SETTINGS` (dans `app.py`).
- Modifie les textes (multi-langues) dans `static/js/i18n.js`.
- Ajoute des variantes de mini-jeux en doublant les fichiers `t3.v###.js` / `t4.v###.js`.
- Le parcours de sélection est rendu par `templates/select_games.html`, avec la séquence persistée dans `localStorage` par `static/js/flow.js`.

### 🤝 Contribution
1. Fork / clone, crée une branche (localement) et garde un ton fun.
2. Assure-toi que ton code respecte le style existant (vanilla JS + Tailwind).
3. Teste en local, puis ouvre une PR.

### 📜 Licence
Le projet est sous licence MIT (voir [LICENSE](LICENSE)).

---

## 🇬🇧 English

### 🍸 Overview
**jsuisdechire** is a glittery Flask web app to check your post-party vibes. Blaze through up to eleven mini-games (reaction, colors, pursuit, balance, memory, cup shot, driving, ice cube, bartender, and Dino Dash), earn a "party mode" score, and climb the leaderboard if you nail it. It's goofy fun, but remember: this is **not** a medical tool.

### ✨ Features
- **11 bite-sized tests**:
  - 🟢 *Reaction (t1)* – Tap when the tile goes green; your median time drives the score.
  - 🌈 *Color chaos (t2)* – Stroop-like challenge mixing accuracy and speed.
  - 🎯 *Target chase (t3)* – Catch the jittery target; precision or time gets recorded.
  - ⚖️ *Balance check (t4)* – Uses device motion sensors to judge your wobble.
  - 🥤 *Cup reflex (t6)* – Adjust angle and power to land the ball in the cup.
  - 🚗 *Sober driving (t7)* – Switch lanes and avoid obstacles without piling up collisions.
  - 🧠 *Memory (t5)* – Reproduce sequences while keeping mistakes and response time low.
  - 🧊 *Crazy ice (t9)* – Catch falling ice cubes while avoiding traps and keeping your combo.
  - 🍸 *Precise bartender (t10)* – Tilt your phone to guide a glass, catch ice cubes, and avoid spills.
  - 🦖 *Dino Dash (t11)* – Hold your phone and jump in real life to make the dino leap over obstacles.
- **Custom sessions**: when enabled in the admin console, players can choose their games from a mobile-friendly illustrated grid; the random cartoon card is numbered 01.
- **Training mode** (`/training`): try every mini-game before starting an official run. Disabled games remain available with a beta badge and stay excluded from official sessions.
- **Latest-score deletion**: signed-in players can remove their latest saved score from the results screen or profile, subject to the configurable daily limit (3 by default).
- **Compact score tables**: the global leaderboard and profile history include all 11 games with clean vertical game headers.
- **Optional feedback**: after the final score, players can rate every game they played from 1 to 5 stars and describe the difficulty, with their score shown on each card.
- **Stylish results screen** with summary, per-test breakdown, and share button.
- **Smooth flow**: once a test is finished, it cannot be accidentally replayed; the session continues to the next game or final score.
- **Cartoon mini-games**: Reaction uses a real orange-to-green press button, while Stroop turns the paint cards into tactile color buttons.
- **Public leaderboard** (`/leaderboard`) with automatic saving after each run.
- **Admin console** (`/admin`) to tweak settings or wipe the database.
- **Offline-friendly** thanks to a service worker and versioned assets.
- **Dynamic i18n** (see `static/js/i18n.js`) + light/dark theme toggle.

### 🛠️ Stack & architecture
- **Backend**: Flask + SQLite (`data.sqlite`).
- **Frontend**: Jinja templates, locally compiled Tailwind CSS, and vanilla JavaScript.
- **Service worker**: `/sw.js`, rendered from `templates/sw.js`.
- **Settings management**: `/api/settings` (read) & `/api/admin/*` (write, scores, purge).
- **Local storage**: keeps session progress and scores before submission.

```
📁 jsuisdechire/
├── app.py              # Flask routes, API, admin, scoring pipeline
├── templates/          # Pages (home, selection, training, t1..t11, leaderboard, admin, JJ HUB, ...)
├── static/js/          # Front logic (tests, session, i18n, results)
├── static/branding/    # Logos, brand marks, and game-selection visuals
├── static/icons/       # PWA icons & manifest
├── deploy.sh           # Reproducible SSH deployment
└── data.sqlite         # Autogenerated database
```

### 🚀 Getting started
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install flask werkzeug standard-imghdr
python app.py  # defaults to 0.0.0.0:9001
```

- The `standard-imghdr` package ships the `imghdr` module that left the Python 3.13 standard library, preventing `ModuleNotFoundError` on Debian 13 deployments.
- App runs at `http://localhost:9001`.
- SQLite database is created automatically.
- Optional env vars:
  - `SECRET_KEY` – session signing key.
  - `GOOGLE_ANALYTICS_ID` – GA4 measurement ID (`G-XXXXXXXXXX`); Consent Mode v2 denies consent by default in the EEA, United Kingdom and Switzerland and grants it elsewhere; tracking remains disabled when empty.
  - `ASSET_VERSION` – bump to bust static caches.

### 👩‍💻 Admin & scoring
- Admin login: `/admin`; use a unique login and password.
- The settings page is organized into tabs: session & experience, mini-games, account & email, player feedback, and score editor. The “Game selection” panel reuses the cartoon card grid from the player flow: click a card to enable/disable a game, with a green check and active-game counter. Mini-games also have a second navigation level so only one calibration panel is shown at a time, without removing any option.
- The admin console also controls the daily latest-score deletion limit; setting it to `0` disables player deletion.
- Change credentials, clear scores from the dedicated score editor, fine-tune each mini-game, enable player game selection, launch a live preview with unsaved values, validate settings, or test SMTP delivery to an explicit address from the dashboard.
- Global actions stay at the bottom of the page and are not persistently fixed on mobile. Clearing scores uses a themed modal and requires typing “DELETE” before confirmation.
- The admin dashboard also includes sortable/filterable player feedback grouped to one row per voter, with login and vote date, per-game averages, difficulty trends, tuning recommendations, and individual vote deletion.
- Each mini-game card shows its global average score and its share of all recorded games as progress bars. All sensitive confirmations use themed modals instead of native browser dialogs.
- The “Enable player feedback” setting can hide the form and disable new feedback submissions.
- The SMTP password is never injected into the admin HTML; leaving the field blank keeps the existing secret.
- Google Analytics 4 uses Google Consent Mode v2: set `GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX` in production to enable regional consent handling, with consent denied by default in the EEA, United Kingdom and Switzerland and granted elsewhere. The banner lets visitors accept or refuse, and preferences remain available in the footer.
- `/api/submit` stores total + per-test scores, timestamp, and nickname.
- Signed-in players can delete only their latest account-owned score through `/api/scores/last/delete`; the server enforces the daily quota. The profile exposes the action and lists every game, while global and profile tables use vertical game headers to save horizontal space.
- Player feedback is submitted to `/api/feedback` and available to admins through `/api/admin/feedback`.

### 🎨 Customization tips
- Tweak thresholds and weights in `DEFAULT_SETTINGS` inside `app.py`.
- Update translations inside `static/js/i18n.js`.
- Craft alternate game flows by cloning `t3.v###.js` / `t4.v###.js` blueprints.
- The selection flow lives in `templates/select_games.html`; the chosen sequence is persisted in `localStorage` by `static/js/flow.js`.

### 🤝 Contributing
1. Fork/clone, hack on a feature (keep it playful).
2. Follow the existing vanilla JS + Tailwind style.
3. Test locally, then open a PR.

### 📜 License
MIT License (see [LICENSE](LICENSE)).

---

## 🇮🇹 Italiano

### 🍸 Panoramica
**jsuisdechire** è una web app Flask piena di brillantini per verificare come stai dopo l'aperitivo. Affronti fino a sette mini-giochi (reazione, colori, inseguimento, equilibrio, memoria, riflesso bicchiere e guida), ottieni un punteggio in modalità "serata tra amici" e puoi scalare la classifica se fai faville. È tutto molto divertente, ma ricorda: **non** è un dispositivo medico.

### ✨ Funzionalità
- **7 test lampo**:
  - 🟢 *Reazione (t1)* – Tocca quando il riquadro diventa verde; la tua mediana fa il punteggio.
  - 🌈 *Colori (t2)* – Sfida in stile Stroop: scegli il colore reale, velocità e precisione contano.
  - 🎯 *Inseguimento (t3)* – Acchiappa il bersaglio ballerino; registriamo precisione o tempo di cattura.
  - ⚖️ *Equilibrio (t4)* – Sfrutta i sensori del telefono per misurare la tua stabilità.
  - 🥤 *Riflesso bicchiere (t6)* – Regola angolo e potenza per centrare il bicchiere.
  - 🚗 *Guida sobria (t7)* – Cambia corsia ed evita gli ostacoli senza accumulare collisioni.
  - 🧠 *Memoria (t5)* – Ripeti le sequenze limitando errori e tempo di risposta.
- **Partite personalizzabili**: se attivata dall'admin, la selezione dei giochi avviene da una griglia illustrata ottimizzata per smartphone, oppure tramite estrazione casuale.
- **Schermata risultati stilosa** con riepilogo, dettagli per test e pulsante di condivisione.
- **Flusso più semplice**: dopo la fine di un test non è possibile rigiocarlo per errore; la partita passa al gioco successivo o al punteggio finale.
- **Feedback facoltativo**: dopo il punteggio finale, il giocatore può valutare ogni mini-gioco provato da 1 a 5 stelle e indicare la difficoltà, con il punteggio ottenuto visibile su ogni scheda.
- **Mini-giochi cartoon**: Reazione usa un vero pulsante da premere che passa da arancione a verde, mentre Stroop trasforma le carte di colore in pulsanti tattili.
- **Classifica pubblica** (`/leaderboard`) che si aggiorna automaticamente dopo ogni run.
- **Pannello admin** (`/admin`) per ritoccare i parametri o pulire il database.
- **Modalità offline parziale** grazie al service worker e agli asset versionati.
- **I18n dinamica** (`static/js/i18n.js`) + switch tema chiaro/scuro.

### 🛠️ Stack & architettura
- **Backend**: Flask + SQLite (`data.sqlite`).
- **Frontend**: Template Jinja, Tailwind CSS compilato localmente e JavaScript vanilla.
- **Service worker**: route `/sw.js`, renderizzata da `templates/sw.js`.
- **Gestione impostazioni**: `/api/settings` (lettura) e `/api/admin/*` (scrittura, punteggi, pulizia).
- **Storage locale**: `localStorage` conserva stato della sessione e punteggi prima dell'invio.

```
📁 jsuisdechire/
├── app.py              # Route Flask, API, admin e pipeline di punteggio
├── templates/          # Pagine (home, t1..t7, leaderboard, admin, JJ HUB, ...)
├── static/js/          # Logica front (test, sessione, i18n, risultati)
├── static/branding/    # Loghi orizzontali e pittogrammi del brand
├── static/icons/       # Icone PWA + manifest
├── deploy.sh           # Deploy SSH riproducibile
└── data.sqlite         # Database generato automaticamente
```

### 🚀 Installazione & avvio
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install flask werkzeug
python app.py  # espone 0.0.0.0:9001
```

- L'app gira su `http://localhost:9001`.
- Il database SQLite viene creato automaticamente.
- Variabili opzionali:
  - `SECRET_KEY` – chiave di sessione Flask.
  - `GOOGLE_ANALYTICS_ID` – ID di misurazione GA4 (`G-XXXXXXXXXX`); Consent Mode v2 nega il consenso per impostazione predefinita nello SEE, nel Regno Unito e in Svizzera e lo concede altrove; il tracciamento resta disattivato se vuoto.
  - `ASSET_VERSION` – incrementa per forzare il refresh degli asset statici.

### 👩‍💻 Admin & punteggi
- Login admin: `/admin`; usa credenziali uniche.
- La pagina impostazioni è divisa in schede per partita, mini-giochi, account/email, feedback giocatori ed edizione dei punteggi. In « Selezione giochi » la gestione usa la stessa griglia di schede cartoon del giocatore: clic per attivare/disattivare, spunta verde e contatore dei giochi attivi. I mini-giochi hanno inoltre una seconda navigazione per calibrare un pannello alla volta.
- Dal pannello puoi cambiare credenziali, cancellare i punteggi nell’editor dedicato, calibrare ogni mini-gioco, avviare un’anteprima dal vivo con i valori non salvati, validare i parametri o testare l’invio SMTP verso un indirizzo esplicito.
- Le azioni globali restano in fondo alla pagina e non sono fissate permanentemente su mobile. La cancellazione dei punteggi usa una modale coerente col tema e richiede di digitare « DELETE » prima della conferma.
- Il pannello admin include anche i feedback: riepilogo per gioco, medie globali, tendenze di difficoltà, tabella dettagliata ordinabile e filtrabile con una riga per votante, login e data, oltre alla cancellazione individuale dei voti.
- Ogni mini-gioco mostra la media globale del punteggio e la percentuale di partite in cui è apparso, entrambe con una barra di avanzamento. Le conferme sensibili usano modali interne, mai finestre native del browser.
- L’impostazione « Attiva i feedback dei giocatori » permette di nascondere il modulo e disattivare l’invio di nuovi voti.
- La password SMTP non viene mai inserita nell’HTML dell’admin; lasciare vuoto il campo conserva il segreto esistente.
- Google Analytics 4 usa Google Consent Mode v2: imposta `GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX` nell’ambiente di produzione per gestire il consenso per area geografica. Il consenso è negato per impostazione predefinita nello SEE, nel Regno Unito e in Svizzera e concesso altrove; il banner e le preferenze nel footer permettono di modificarlo.
- `/api/submit` salva punteggio totale, dettaglio per test, timestamp e nickname.
- I feedback vengono inviati a `/api/feedback` e sono consultabili dagli admin tramite `/api/admin/feedback`.

### 🎨 Personalizzazione rapida
- Modifica durate, soglie e pesi in `DEFAULT_SETTINGS` dentro `app.py`.
- Aggiorna le traduzioni in `static/js/i18n.js`.
- Crea varianti duplicando i file `t3.v###.js` / `t4.v###.js`.

### 🤝 Contributi
1. Fai fork/clone, mantieni il tono scanzonato.
2. Rispetta lo stile esistente (JS vanilla + Tailwind).
3. Testa in locale e apri una PR.

### 📜 Licenza
Licenza MIT (vedi [LICENSE](LICENSE)).

---

<p align="center">🚕 Hydrate, stay safe, and never drink & drive.</p>
