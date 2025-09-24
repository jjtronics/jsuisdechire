<h1 align="center">🍹 jsuisdechire · Mini-jeux pour savoir si tu es (un peu trop) déchiré·e</h1>

<p align="center">
  <strong><a href="#-francais">🇫🇷 Français</a> · <a href="#-english">🇬🇧 English</a> · <a href="#-italiano">🇮🇹 Italiano</a></strong>
</p>

---

## 🇫🇷 Français

### 🍸 Aperçu
**jsuisdechire** est une web app Flask pleine de paillettes pour vérifier ton état après l'apéro. Tu enchaînes quatre mini-jeux (réflexes, couleurs, poursuite et équilibre), tu obtiens un score façon "soirée entre potes", et tu peux grimper sur le leaderboard si tu assures. Fun garanti, mais rappel : ce n'est PAS un dispositif médical.

### ✨ Fonctionnalités
- **4 tests rapides** :
  - 🟢 *Réaction (t1)* – Tape dès que ça passe au vert, ton temps médian devient ton score.
  - 🌈 *Couleurs (t2)* – Version Stroop : clique la vraie couleur, pas le mot, vitesse + précision.
  - 🎯 *Poursuite (t3)* – Attrape une cible qui virevolte; précision ou temps de capture.
  - ⚖️ *Équilibre (t4)* – Utilise les capteurs du téléphone pour mesurer ta stabilité.
- **Résultats stylés** avec résumé, détails par test et bouton de partage.
- **Classement public** (`/leaderboard`) avec sauvegarde automatique après chaque run.
- **Panneau admin** (`/admin`) pour configurer les paramètres ou purger la base.
- **Mode hors-ligne léger** grâce au service worker et aux assets versionnés.
- **I18n dynamique** (via `static/js/i18n.js`) + thème clair/sombre 🎚️.

### 🛠️ Stack & architecture
- **Backend** : Flask + SQLite (`data.sqlite`).
- **Frontend** : Templates Jinja + Tailwind CDN + JavaScript vanilla.
- **Service worker** : `static/sw.js` pour cache léger.
- **Gestion des paramètres** : `/api/settings` (lecture), `/api/admin/*` (écriture, scores, purge).
- **Stockage local** : `localStorage` pour l'état de session et les scores avant soumission.

```
📁 jsuisdechire/
├── app.py              # Routes Flask + API + admin + scoring
├── templates/          # Pages (home, t1..t4, leaderboard, admin, etc.)
├── static/js/          # Logique front (tests, session, i18n, résultats)
├── static/icons/       # PWA icons & manifest
└── data.sqlite         # Créé automatiquement au lancement
```

### 🚀 Installation & lancement
```bash
python -m venv .venv
source .venv/bin/activate  # Windows : .venv\Scripts\activate
pip install flask werkzeug standard-imghdr
export FLASK_ENV=development  # optionnel pour le debug
python app.py  # démarre sur 0.0.0.0:9001
```

- Le paquet `standard-imghdr` fournit le module `imghdr`, retiré de la bibliothèque standard depuis Python 3.13, afin d'éviter les `ModuleNotFoundError` sur Debian 13.
- L'application écoute sur `http://localhost:9001`.
- La base SQLite (`data.sqlite`) est créée automatiquement.
- Variables utiles :
  - `SECRET_KEY` (clé de session Flask) – par défaut `dev-secret`.
  - `ASSET_VERSION` pour invalider le cache des assets statiques.

### 👩‍💻 Admin & scores
- Accès admin : `/admin` (login initial **admin/jsuisdechire**).
- Tu peux modifier login/mot de passe, purger les scores ou ajuster les paramètres de chaque test.
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
**jsuisdechire** is a glittery Flask web app to check your post-party vibes. Blaze through four mini-games (reaction, colors, pursuit, balance), earn a "party mode" score, and climb the leaderboard if you nail it. It's goofy fun, but remember: this is **not** a medical tool.

### ✨ Features
- **4 bite-sized tests**:
  - 🟢 *Reaction (t1)* – Tap when the tile goes green; your median time drives the score.
  - 🌈 *Color chaos (t2)* – Stroop-like challenge mixing accuracy and speed.
  - 🎯 *Target chase (t3)* – Catch the jittery target; precision or time gets recorded.
  - ⚖️ *Balance check (t4)* – Uses device motion sensors to judge your wobble.
- **Stylish results screen** with summary, per-test breakdown, and share button.
- **Public leaderboard** (`/leaderboard`) with automatic saving after each run.
- **Admin console** (`/admin`) to tweak settings or wipe the database.
- **Offline-friendly** thanks to a service worker and versioned assets.
- **Dynamic i18n** (see `static/js/i18n.js`) + light/dark theme toggle.

### 🛠️ Stack & architecture
- **Backend**: Flask + SQLite (`data.sqlite`).
- **Frontend**: Jinja templates, Tailwind CDN, and vanilla JavaScript.
- **Service worker**: `static/sw.js` for lightweight caching.
- **Settings management**: `/api/settings` (read) & `/api/admin/*` (write, scores, purge).
- **Local storage**: keeps session progress and scores before submission.

```
📁 jsuisdechire/
├── app.py              # Flask routes, API, admin, scoring pipeline
├── templates/          # Pages (home, t1..t4, leaderboard, admin, ...)
├── static/js/          # Front logic (tests, session, i18n, results)
├── static/icons/       # PWA icons & manifest
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
  - `ASSET_VERSION` – bump to bust static caches.

### 👩‍💻 Admin & scoring
- Admin login: `/admin` with **admin/jsuisdechire** by default.
- Change credentials, clear scores, or fine-tune each mini-game from the dashboard.
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
**jsuisdechire** è una web app Flask piena di brillantini per verificare come stai dopo l'aperitivo. Affronti quattro mini-giochi (riflessi, colori, inseguimento, equilibrio), ottieni un punteggio in modalità "serata tra amici" e puoi scalare la classifica se fai faville. È tutto molto divertente, ma ricorda: **non** è un dispositivo medico.

### ✨ Funzionalità
- **4 test lampo**:
  - 🟢 *Reazione (t1)* – Tocca quando il riquadro diventa verde; la tua mediana fa il punteggio.
  - 🌈 *Colori (t2)* – Sfida in stile Stroop: scegli il colore reale, velocità e precisione contano.
  - 🎯 *Inseguimento (t3)* – Acchiappa il bersaglio ballerino; registriamo precisione o tempo di cattura.
  - ⚖️ *Equilibrio (t4)* – Sfrutta i sensori del telefono per misurare la tua stabilità.
- **Schermata risultati stilosa** con riepilogo, dettagli per test e pulsante di condivisione.
- **Classifica pubblica** (`/leaderboard`) che si aggiorna automaticamente dopo ogni run.
- **Pannello admin** (`/admin`) per ritoccare i parametri o pulire il database.
- **Modalità quasi offline** grazie al service worker e agli asset versionati.
- **I18n dinamica** (`static/js/i18n.js`) + switch tema chiaro/scuro.

### 🛠️ Stack & architettura
- **Backend**: Flask + SQLite (`data.sqlite`).
- **Frontend**: Template Jinja, Tailwind da CDN e JavaScript vanilla.
- **Service worker**: `static/sw.js` per una cache leggera.
- **Gestione impostazioni**: `/api/settings` (lettura) e `/api/admin/*` (scrittura, punteggi, pulizia).
- **Storage locale**: `localStorage` conserva stato della sessione e punteggi prima dell'invio.

```
📁 jsuisdechire/
├── app.py              # Route Flask, API, admin e pipeline di punteggio
├── templates/          # Pagine (home, t1..t4, leaderboard, admin, ...)
├── static/js/          # Logica front (test, sessione, i18n, risultati)
├── static/icons/       # Icone PWA + manifest
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
  - `ASSET_VERSION` – incrementa per forzare il refresh degli asset statici.

### 👩‍💻 Admin & punteggi
- Login admin: `/admin` con credenziali iniziali **admin/jsuisdechire**.
- Dal pannello puoi cambiare credenziali, cancellare i punteggi o calibrare ogni mini-gioco.
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
