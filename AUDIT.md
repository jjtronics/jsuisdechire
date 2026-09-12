# Audit du site jsuisdechire

Date du contrôle : **12 septembre 2026**
Environnement contrôlé : **https://jsuisdechire.com** et le dépôt local associé.

Ce document consigne les problèmes constatés pendant le tour du site et les corrections livrées après cet audit. La rotation des identifiants SMTP reste à effectuer manuellement par le propriétaire.

## Évolutions livrées après l’audit

- Création du JJ HUB dans le footer, avec six cartes dans l’ordre de JJTRONICS : GitHub, JJTRONICS, SondaStream, TestiCool, Guinadi et JsuisDechire.
- Ajout du script [`deploy.sh`](deploy.sh), avec archive sélective, sauvegarde distante, restauration possible, redémarrage systemd et contrôles HTTP.
- Intégration de la marque : logo horizontal complet en couleur et transparent dans l’en-tête, petit pictogramme dans le footer et dans la carte JsuisDechire du JJ HUB.
- Remplacement des placeholders PWA 1×1 par des icônes 192×192 et 512×512.
- Renforcement de production : Gunicorn, clé `SECRET_KEY` dédiée, cookies sécurisés, CSRF, redirections locales et en-têtes HTTP de sécurité.
- Suppression de l’exposition publique des réglages SMTP ; `/api/settings` ne renvoie plus ces valeurs aux visiteurs.
- Classement mobile converti en cartes repliables, avec détail des sept épreuves par joueur.
- Ajout des balises SEO, d’un favicon, de `robots.txt`, d’un cache hors-ligne précaché et d’une version WebP optimisée du logo horizontal.
- Déploiements vérifiés par SSH avec correspondance des empreintes SHA-256 locales/distantes.

Derniers déploiements contrôlés :

- `2026-09-12 16:02 UTC` : première mise en ligne du script et des sept tests.
- `2026-09-12 16:05 UTC` : branding horizontal couleur.
- `2026-09-12 16:07 UTC` : logo horizontal transparent et pictogramme footer.
- `2026-09-12 16:09 UTC` : logo horizontal agrandi.
- `2026-09-12 16:10 UTC` : pictogramme aligné devant « Reste en vibe ».
- `2026-09-12 16:13 UTC` : pictogramme officiel dans la carte JsuisDechire du JJ HUB.

À la suite de ces déploiements, `/`, `/t6`, `/t7`, `/jj-hub` et les assets de marque répondaient en HTTP 200, et le service systemd `jsuisdechire` était actif.

## Périmètre

Pages et parcours vérifiés :

- accueil, tests, résultats et classement ;
- connexion, inscription, mot de passe oublié et profil ;
- connexion admin ;
- crédits et JJ HUB ;
- affichage desktop et mobile, notamment le classement ;
- réponses HTTP, console navigateur, templates présents sur le serveur et configuration du service.

## Priorités

- **P0 — Bloquant / sécurité immédiate** : à traiter avant toute nouvelle mise en ligne.
- **P1 — Important** : impact fort sur la sécurité, l’intégrité des données ou l’expérience.
- **P2 — Amélioration** : qualité, cohérence, performance ou finition.

## Constats prioritaires

### P0-01 — [Résolu] Les tests t6 et t7 renvoyaient une erreur 500

Les URLs publiques suivantes affichent une erreur `TemplateNotFound` :

- [https://jsuisdechire.com/t6](https://jsuisdechire.com/t6)
- [https://jsuisdechire.com/t7](https://jsuisdechire.com/t7)

Les routes existent dans [`app.py`](app.py#L728), ainsi que les fichiers [`templates/t6.html`](templates/t6.html) et [`templates/t7.html`](templates/t7.html) en local, mais les templates t6/t7 étaient absents de `/opt/jsuisdechire/app/templates` sur le serveur lors du contrôle.

**Impact initial :** deux des sept épreuves annoncées étaient inutilisables.
**Résolution :** templates et assets déployés avec `deploy.sh`, puis routes t6/t7 contrôlées en HTTP 200 et présence vérifiée en SSH.

### P0-02 — [Résolu] Le serveur de production tournait avec le debugger Flask

Le point d’entrée lance Flask avec `debug=True` dans [`app.py`](app.py#L1974). Les erreurs publiques affichent donc le debugger Werkzeug et la trace interne de l’application.

**Impact :** divulgation de chemins, versions et détails internes ; risque de sécurité supplémentaire lié au debugger exposé.
**Résolution :** l’unité systemd lance désormais Gunicorn avec `FLASK_ENV=production`, et `app.py` ne peut activer le debug que via `FLASK_DEBUG`.

### P0-03 — [Résolu côté interface] Les identifiants admin par défaut étaient affichés publiquement

La page [`templates/admin_login.html`](templates/admin_login.html#L21) affiche encore `admin / jsuisdechire`. Le README mentionne également ces identifiants initiaux.

**Impact :** toute personne peut connaître le couple initial ; l’information ne doit jamais rester visible sur une instance publique.
**Résolution :** l’indication a été supprimée. Le propriétaire doit encore confirmer que le mot de passe admin actuel est unique.

### P0-04 — [Résolu côté code] Les réglages SMTP étaient exposés publiquement

`/api/settings` et le contexte Jinja transmettaient auparavant toute la configuration, y compris les réglages SMTP.

**Résolution :** les réglages SMTP sont filtrés pour les visiteurs et restent accessibles uniquement à l’espace admin authentifié. Les identifiants déjà présents doivent être renouvelés manuellement.

## Sécurité et intégrité

### P1-01 — [Partiellement résolu] Le score total était fourni par le navigateur

[`/api/submit`](app.py#L1201) convertit puis enregistre directement `total_score` envoyé par le client. Les détails des épreuves sont eux aussi reçus côté client et aucune recomposition complète du score n’est effectuée côté serveur.

**Impact :** injection possible de scores artificiels dans le classement.
**Résolution :** le total est recalculé côté serveur, arrondi comme dans le client, les mesures enregistrées sont converties et bornées côté serveur, et les soumissions sont limitées à six par minute et par adresse client. Une validation cryptographique des mesures brutes resterait utile si le classement devient une cible d’abus sophistiquée.

### P1-02 — [Résolu] Clé de session de secours dangereuse

Avant correction, le code utilisait `dev-secret` si `SECRET_KEY` n’était pas définie : [`app.py`](app.py#L20).

**Impact :** si la variable n’est pas correctement configurée sur le serveur, les sessions reposent sur une valeur connue.
**Résolution :** le démarrage échoue si `SECRET_KEY` manque en production ; `deploy.sh` crée une clé dédiée de 64 caractères dans `/etc/jsuisdechire.env` si nécessaire.

### P1-03 — [Résolu] Absence de protection CSRF explicite

Les formulaires et endpoints POST d’authentification, de profil et d’administration ne contiennent pas de jeton CSRF visible. Exemples : [`login.html`](templates/login.html#L17), [`profile.html`](templates/profile.html#L31), [`app.py`](app.py#L1011).

**Impact :** les actions basées sur session méritent une protection explicite contre les requêtes forgées.
**Résolution :** un jeton CSRF est vérifié côté serveur pour les requêtes d’écriture, injecté dans les formulaires et ajouté automatiquement aux appels `fetch`; les cookies utilisent `HttpOnly`, `SameSite=Lax` et `Secure` en production.

### P1-04 — [Résolu] Redirections `next` non validées

La valeur `next` est reprise depuis la requête puis utilisée directement dans [`app.py`](app.py#L1403) et [`app.py`](app.py#L1421).

**Impact :** possibilité de redirection vers un site externe depuis un lien de connexion spécialement construit.
**Résolution :** seules les destinations locales commençant par un chemin `/` sont acceptées.

## Expérience utilisateur

### P1-05 — [Résolu] Classement difficile à utiliser sur mobile

Le podium se comprime fortement sur petit écran et le tableau contient onze colonnes dans un conteneur à défilement horizontal : [`templates/leaderboard.html`](templates/leaderboard.html#L251) et [`templates/leaderboard.html`](templates/leaderboard.html#L333).

**Impact :** noms tronqués, podium peu lisible et colonnes invisibles sans comprendre qu’il faut faire glisser le tableau.
**Résolution :** le tableau complet reste disponible sur desktop ; sur mobile, chaque ligne devient une carte repliable avec pseudo, rang, total et détail des sept scores.

### P1-06 — [Résolu] Le nombre de tests affiché ne correspondait pas aux tests proposés

L’accueil affiche le nombre configuré, mais énumère toujours les sept épreuves : [`templates/home.html`](templates/home.html#L47).

**Impact :** l’utilisateur peut voir « 4 mini-tests » suivi d’une liste de 7 tests, selon la configuration active.
**Résolution :** l’accueil indique désormais simplement « Plusieurs tests rapides ».

## Qualité technique et finition

### P2-01 — [Résolu] Tailwind était chargé depuis le CDN en production

[`templates/base.html`](templates/base.html#L7) charge `cdn.tailwindcss.com`. Le navigateur signale que cette méthode est destinée au développement.

**Résolution :** Tailwind est compilé localement via `package.json` et `tailwind.config.js`, puis servi depuis `static/css/tailwind.css` avec l’empreinte d’asset habituelle. La CSP n’autorise plus le CDN Tailwind ni `unsafe-eval`.

### P2-02 — [Résolu] Grand espace vide sous le footer sur desktop

Le wrapper principal est `min-h-screen` sans structure flex verticale et le `<main>` n’occupe pas l’espace restant : [`templates/base.html`](templates/base.html#L28) et [`templates/base.html`](templates/base.html#L89).

**Résolution :** le layout principal utilise maintenant une colonne flex et un `<main>` extensible.

### P2-03 — [Résolu] Le service worker ne remplissait jamais son cache

Le service worker ouvre un cache mais ne fait aucun `cache.addAll`, `cache.put` ou équivalent : [`templates/sw.js`](templates/sw.js#L3).

**Impact :** le mode hors-ligne annoncé dans le README ne fonctionne pas réellement pour une première visite hors connexion.

**Résolution :** l’app shell et les assets essentiels sont précachés ; les API restent en réseau uniquement et les ressources GET sont mises en cache après leur chargement.
Le cache porte un nom versionné par l’empreinte des templates et assets, et les clients prennent immédiatement le nouveau service worker.

### P2-04 — [Résolu] La sélection de texte était désactivée sur tout le site

[`templates/base.html`](templates/base.html#L22) applique `user-select: none` au `body` entier.

**Impact :** impossible de sélectionner/copier les instructions, noms du classement, crédits ou messages d’erreur.
**Résolution :** la règle globale a été supprimée.

### P2-05 — [Résolu] Titres de pages trop génériques

Le `<title>` est défini une seule fois dans [`templates/base.html`](templates/base.html#L6), ce qui donne le même titre à l’accueil, au classement, aux crédits, à l’authentification et au JJ HUB.

**Résolution :** les pages importantes ont maintenant des titres dédiés, une description, une URL canonical et des métadonnées Open Graph/X.

### P2-06 — [Résolu] En-têtes HTTP de sécurité à renforcer

La réponse publique contrôlée contient HSTS, mais pas de CSP, `X-Content-Type-Options`, `Referrer-Policy` ou politique d’encadrement équivalente.

**Résolution :** CSP, `X-Content-Type-Options`, `Referrer-Policy` et `Permissions-Policy` sont désormais envoyés par l’application.

### P2-07 — [Résolu] Documentation fonctionnelle obsolète

Le README décrit encore quatre tests et indique un chemin `static/sw.js`, alors que le service worker est rendu par la route `/sw.js` depuis [`templates/sw.js`](templates/sw.js#L1) et que l’application contient t1 à t7.

**Résolution :** README et CHANGELOG ont été mis à jour pour le nouveau déploiement et le mode hors-ligne partiel.

### P2-08 — Poids du logo horizontal

La version PNG originale reste conservée comme fallback, mais elle est lourde pour un affichage d’en-tête.

**Résolution :** le navigateur utilise maintenant une version WebP transparente d’environ 114 Ko, avec fallback PNG.

## Points constatés comme fonctionnels

Lors du contrôle, les pages suivantes se chargeaient correctement : accueil, t1 à t7, résultats, classement, connexion, inscription, crédits et JJ HUB. Le JJ HUB affichait bien les six cartes dans l’ordre attendu. Aucun problème JavaScript bloquant n’a été observé sur ces pages ; le CDN Tailwind a depuis été remplacé par une feuille locale.

## Checklist de reprise

- [x] Déployer et tester `t6` et `t7`.
- [x] Désactiver Flask debug et passer par un serveur WSGI de production.
- [x] Retirer les identifiants admin affichés.
- [x] Vérifier `SECRET_KEY` sur le serveur et supprimer le fallback de production.
- [x] Sécuriser les POST : CSRF, recalcul du total et redirections locales.
- [x] Repenser le classement mobile.
- [x] Corriger le texte du nombre de tests.
- [x] Corriger le footer, la sélection de texte et les titres de pages.
- [x] Mettre en place un mode hors-ligne partiel.
- [x] Compiler Tailwind localement et retirer l’avertissement CDN.
- [x] Valider et limiter les soumissions de scores côté serveur.
- [x] Ajouter des tests automatisés Flask et des contrôles de syntaxe JavaScript.
- [x] Renforcer les repères clavier, les focus visibles et le respect de `prefers-reduced-motion`.
- [x] Renforcer les en-têtes HTTP.
- [x] Mettre à jour le README et le CHANGELOG.
- [ ] Renouveler les identifiants SMTP qui ont été exposés avant la correction du filtrage.
