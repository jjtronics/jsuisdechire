<h1 align="center">🍹 jsuisdechire · Mini-jeux pour savoir si tu es (un peu trop) déchiré·e</h1>

<p align="center">
  <strong><a href="#-francais">🇫🇷 Français</a> · <a href="#-english">🇬🇧 English</a> · <a href="#-espanol">🇪🇸 Español</a></strong>
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
pip install flask werkzeug
export FLASK_ENV=development  # optionnel pour le debug
python app.py  # démarre sur 0.0.0.0:9001
```

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
pip install flask werkzeug
python app.py  # defaults to 0.0.0.0:9001
```

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

## 🇪🇸 Español

### 🍸 Visión general
**jsuisdechire** es una app web con mucha purpurina hecha en Flask para comprobar tu estado después de la fiesta. Supera cuatro mini-juegos (reacción, colores, persecución, equilibrio), consigue un puntaje en modo "pana" y sube en el ranking si te luciste. Es divertido, pero recuerda: **no** es una herramienta médica.

### ✨ Funcionalidades
- **4 pruebas exprés**:
  - 🟢 *Reacción (t1)* – Toca cuando el cuadro se vuelve verde; la mediana marca la nota.
  - 🌈 *Colores (t2)* – Desafío tipo Stroop: importa la velocidad y acertar el color real.
  - 🎯 *Persecución (t3)* – Atrapa el objetivo tembloroso; guardamos precisión o tiempo.
  - ⚖️ *Equilibrio (t4)* – Usa los sensores del móvil para medir tu estabilidad.
- **Pantalla de resultados con estilo**: resumen, detalle por prueba y botón para compartir.
- **Tabla de posiciones** (`/leaderboard`) que se actualiza sola tras cada intento.
- **Panel de administración** (`/admin`) para ajustar parámetros o limpiar la base.
- **Modo semi-offline** gracias al service worker y assets versionados.
- **Internacionalización dinámica** (`static/js/i18n.js`) + cambio de tema claro/oscuro.

### 🛠️ Stack y arquitectura
- **Backend**: Flask + SQLite (`data.sqlite`).
- **Frontend**: Plantillas Jinja, Tailwind vía CDN y JavaScript puro.
- **Service worker**: `static/sw.js` para cache liviano.
- **Gestión de ajustes**: `/api/settings` (leer) y `/api/admin/*` (escritura, scores, limpieza).
- **Almacenamiento local**: `localStorage` guarda progreso y puntajes antes del envío.

```
📁 jsuisdechire/
├── app.py              # Rutas Flask, API, panel admin y lógica de puntajes
├── templates/          # Páginas (home, t1..t4, ranking, admin, ...)
├── static/js/          # Lógica front (tests, sesión, i18n, resultados)
├── static/icons/       # Íconos PWA + manifest
└── data.sqlite         # Base generada automáticamente
```

### 🚀 Puesta en marcha
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install flask werkzeug
python app.py  # expone 0.0.0.0:9001
```

- Visita `http://localhost:9001`.
- La base SQLite aparece sola al iniciar.
- Variables opcionales:
  - `SECRET_KEY` – clave de sesión Flask.
  - `ASSET_VERSION` – incrementa para forzar recarga de estáticos.

### 👩‍💻 Administración y puntajes
- Login admin: `/admin`, credenciales iniciales **admin/jsuisdechire**.
- Desde el panel cambias credenciales, limpias puntajes o ajustas cada mini-juego.
- `/api/submit` guarda total, detalles por prueba, timestamp y apodo.

### 🎨 Personalización
- Modifica tiempos y pesos en `DEFAULT_SETTINGS` dentro de `app.py`.
- Traducciones en `static/js/i18n.js`.
- Crea variantes copiando los archivos `t3.v###.js` / `t4.v###.js`.

### 🤝 Contribuciones
1. Haz fork/clone, dale un toque divertido.
2. Respeta el estilo (JS puro + Tailwind).
3. Prueba localmente y abre un PR.

### 📜 Licencia
Licencia MIT (ver [LICENSE](LICENSE)).

---

<p align="center">🚕 Hydrate, stay safe, and never drink & drive.</p>
