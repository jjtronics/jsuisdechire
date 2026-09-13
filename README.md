<h1 align="center">🍹 jsuisdechire · Mini-jeux pour savoir si tu es (un peu trop) déchiré·e</h1>

<p align="center">
  <strong><a href="#-francais">🇫🇷 Français</a> · <a href="#-english">🇬🇧 English</a> · <a href="#-italiano">🇮🇹 Italiano</a></strong>
</p>

> Audit technique et UX du 12 septembre 2026 : [AUDIT.md](AUDIT.md)

---

## 🇫🇷 Français

### 🍸 Aperçu
**jsuisdechire** est une web app Flask pleine de paillettes pour vérifier ton état après l'apéro. Tu enchaînes jusqu'à sept mini-jeux (réaction, couleurs, poursuite, équilibre, mémoire, réflexe gobelet et conduite), tu obtiens un score façon "soirée entre potes", et tu peux grimper sur le leaderboard si tu assures. Fun garanti, mais rappel : ce n'est PAS un dispositif médical.

### ✨ Fonctionnalités
- **7 tests rapides** :
  - 🟢 *Réaction (t1)* – Tape dès que ça passe au vert, ton temps médian devient ton score.
  - 🌈 *Couleurs (t2)* – Version Stroop : clique la vraie couleur, pas le mot, vitesse + précision.
  - 🎯 *Poursuite (t3)* – Attrape une cible qui virevolte; précision ou temps de capture.
  - ⚖️ *Équilibre (t4)* – Utilise les capteurs du téléphone pour mesurer ta stabilité.
  - 🥤 *Réflexe gobelet (t6)* – Ajuste l’angle et la puissance pour faire entrer la balle dans le gobelet.
  - 🚗 *Conduite sobre (t7)* – Change de voie et évite les obstacles sans multiplier les collisions.
  - 🧠 *Mémoire (t5)* – Retrouve les séquences en limitant les erreurs et le temps de réponse.
- **Résultats stylés** avec résumé, détails par test et bouton de partage.
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
├── templates/          # Pages (home, t1..t7, leaderboard, admin, JJ HUB, etc.)
├── static/js/          # Logique front (tests, session, i18n, résultats)
├── static/css/         # Feuille Tailwind compilée et source
├── static/branding/    # Logos horizontaux et pictogrammes de la marque
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

Le script exclut la base SQLite, les secrets, l’environnement virtuel et les uploads locaux de l’archive ; il sauvegarde l’installation distante avant copie, installe la configuration Gunicorn/systemd, crée une clé de session de production si nécessaire, redémarre le service et contrôle les routes principales ainsi que les nouveaux assets de marque.

### 👩‍💻 Admin & scores
- Accès admin : `/admin` (utiliser un login et un mot de passe uniques).
- Tu peux modifier login/mot de passe, purger les scores, ajuster les paramètres de chaque test, lancer chaque mini-jeu en aperçu avec les valeurs non sauvegardées, valider les réglages avant sauvegarde et diagnostiquer ou tester l’envoi SMTP vers une adresse choisie.
- Le mot de passe SMTP n’est jamais injecté dans le HTML de l’admin ; un champ vide conserve le secret existant.
- Les résultats envoyés via `/api/submit` stockent : score total, détails par épreuve, timestamp et pseudo.

### 🎨 Personnalisation rapide
- Ajuste les durées, seuils et poids dans `DEFAULT_SETTINGS` (dans `app.py`).
- Modifie les textes (multi-langues) dans `static/js/i18n.js`.
- Ajoute des variantes de mini-jeux en doublant les fichiers `t3.v###.js` / `t4.v###.js`.

### 🤝 Contribution
1. Fork / clone, crée une branche (localement) et garde un ton fun.
2. Assure-toi que ton code respecte le style existant (vanilla JS + Tailwind).
3. Teste en local, puis ouvre une PR.

### 📜 Licence
Le projet est sous licence MIT (voir [LICENSE](LICENSE)).

---

## 🇬🇧 English

### 🍸 Overview
**jsuisdechire** is a glittery Flask web app to check your post-party vibes. Blaze through up to seven mini-games (reaction, colors, pursuit, balance, memory, cup reflex and driving), earn a "party mode" score, and climb the leaderboard if you nail it. It's goofy fun, but remember: this is **not** a medical tool.

### ✨ Features
- **7 bite-sized tests**:
  - 🟢 *Reaction (t1)* – Tap when the tile goes green; your median time drives the score.
  - 🌈 *Color chaos (t2)* – Stroop-like challenge mixing accuracy and speed.
  - 🎯 *Target chase (t3)* – Catch the jittery target; precision or time gets recorded.
  - ⚖️ *Balance check (t4)* – Uses device motion sensors to judge your wobble.
  - 🥤 *Cup reflex (t6)* – Adjust angle and power to land the ball in the cup.
  - 🚗 *Sober driving (t7)* – Switch lanes and avoid obstacles without piling up collisions.
  - 🧠 *Memory (t5)* – Reproduce sequences while keeping mistakes and response time low.
- **Stylish results screen** with summary, per-test breakdown, and share button.
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
├── templates/          # Pages (home, t1..t7, leaderboard, admin, JJ HUB, ...)
├── static/js/          # Front logic (tests, session, i18n, results)
├── static/branding/    # Horizontal logos and brand marks
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
- Change credentials, clear scores, fine-tune each mini-game, launch a live preview with unsaved values, validate settings, or test SMTP delivery to an explicit address from the dashboard.
- The SMTP password is never injected into the admin HTML; leaving the field blank keeps the existing secret.
- Google Analytics 4 uses Google Consent Mode v2: set `GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX` in production to enable regional consent handling, with consent denied by default in the EEA, United Kingdom and Switzerland and granted elsewhere. The banner lets visitors accept or refuse, and preferences remain available in the footer.
- `/api/submit` stores total + per-test scores, timestamp, and nickname.

### 🎨 Customization tips
- Tweak thresholds and weights in `DEFAULT_SETTINGS` inside `app.py`.
- Update translations inside `static/js/i18n.js`.
- Craft alternate game flows by cloning `t3.v###.js` / `t4.v###.js` blueprints.

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
- **Schermata risultati stilosa** con riepilogo, dettagli per test e pulsante di condivisione.
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
- Dal pannello puoi cambiare credenziali, cancellare i punteggi, calibrare ogni mini-gioco, avviare un’anteprima dal vivo con i valori non salvati, validare i parametri o testare l’invio SMTP verso un indirizzo esplicito.
- La password SMTP non viene mai inserita nell’HTML dell’admin; lasciare vuoto il campo conserva il segreto esistente.
- Google Analytics 4 usa Google Consent Mode v2: imposta `GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX` nell’ambiente di produzione per gestire il consenso per area geografica. Il consenso è negato per impostazione predefinita nello SEE, nel Regno Unito e in Svizzera e concesso altrove; il banner e le preferenze nel footer permettono di modificarlo.
- `/api/submit` salva punteggio totale, dettaglio per test, timestamp e nickname.

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
