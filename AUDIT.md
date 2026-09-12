# Audit du site jsuisdechire

Date du contrôle : **12 septembre 2026**
Environnement contrôlé : **https://jsuisdechire.com** et le dépôt local associé.

Ce document consigne les problèmes constatés pendant le tour du site, puis les évolutions livrées après cet audit. L’audit initial n’a pas appliqué de correction ; les déploiements ultérieurs sont listés ci-dessous.

## Évolutions livrées après l’audit

- Création du JJ HUB dans le footer, avec six cartes dans l’ordre de JJTRONICS : GitHub, JJTRONICS, SondaStream, TestiCool, Guinadi et JsuisDechire.
- Ajout du script [`deploy.sh`](deploy.sh), avec archive sélective, sauvegarde distante, restauration possible, redémarrage systemd et contrôles HTTP.
- Intégration de la marque : logo horizontal complet en couleur et transparent dans l’en-tête, petit pictogramme dans le footer et dans la carte JsuisDechire du JJ HUB.
- Remplacement des placeholders PWA 1×1 par des icônes 192×192 et 512×512.
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

### P0-02 — Le serveur de production tourne avec le debugger Flask

Le point d’entrée lance Flask avec `debug=True` dans [`app.py`](app.py#L1974). Les erreurs publiques affichent donc le debugger Werkzeug et la trace interne de l’application.

**Impact :** divulgation de chemins, versions et détails internes ; risque de sécurité supplémentaire lié au debugger exposé.
**Correction prévue :** lancer l’application avec Gunicorn ou un serveur WSGI équivalent, désactiver le debug en production et ajouter une page d’erreur générique pour les erreurs 5xx.

### P0-03 — Les identifiants admin par défaut sont affichés publiquement

La page [`templates/admin_login.html`](templates/admin_login.html#L21) affiche encore `admin / jsuisdechire`. Le README mentionne également ces identifiants initiaux.

**Impact :** toute personne peut connaître le couple initial ; l’information ne doit jamais rester visible sur une instance publique.
**Correction prévue :** supprimer cette indication, vérifier que le mot de passe actuel a été changé et forcer le changement lors de la première connexion.

## Sécurité et intégrité

### P1-01 — Le score total est fourni par le navigateur

[`/api/submit`](app.py#L1201) convertit puis enregistre directement `total_score` envoyé par le client. Les détails des épreuves sont eux aussi reçus côté client et aucune recomposition complète du score n’est effectuée côté serveur.

**Impact :** injection possible de scores artificiels dans le classement.
**Correction prévue :** recalculer le score côté serveur à partir de données contrôlées, imposer des bornes par épreuve, rejeter les valeurs incohérentes et ajouter une limitation de fréquence.

### P1-02 — Clé de session de secours dangereuse

Le code utilise `dev-secret` si `SECRET_KEY` n’est pas définie : [`app.py`](app.py#L20).

**Impact :** si la variable n’est pas correctement configurée sur le serveur, les sessions reposent sur une valeur connue.
**Correction prévue :** supprimer la valeur par défaut, générer une clé aléatoire forte et faire échouer le démarrage si `SECRET_KEY` manque en production.

### P1-03 — Absence de protection CSRF explicite

Les formulaires et endpoints POST d’authentification, de profil et d’administration ne contiennent pas de jeton CSRF visible. Exemples : [`login.html`](templates/login.html#L17), [`profile.html`](templates/profile.html#L31), [`app.py`](app.py#L1011).

**Impact :** les actions basées sur session méritent une protection explicite contre les requêtes forgées.
**Correction prévue :** ajouter une protection CSRF côté serveur pour les formulaires et les endpoints admin, puis conserver une politique `SameSite` stricte comme défense complémentaire.

### P1-04 — Redirections `next` non validées

La valeur `next` est reprise depuis la requête puis utilisée directement dans [`app.py`](app.py#L1403) et [`app.py`](app.py#L1421).

**Impact :** possibilité de redirection vers un site externe depuis un lien de connexion spécialement construit.
**Correction prévue :** n’autoriser que des chemins locaux ou supprimer ce paramètre pour les parcours qui n’en ont pas besoin.

## Expérience utilisateur

### P1-05 — Classement difficile à utiliser sur mobile

Le podium se comprime fortement sur petit écran et le tableau contient onze colonnes dans un conteneur à défilement horizontal : [`templates/leaderboard.html`](templates/leaderboard.html#L251) et [`templates/leaderboard.html`](templates/leaderboard.html#L333).

**Impact :** noms tronqués, podium peu lisible et colonnes invisibles sans comprendre qu’il faut faire glisser le tableau.
**Correction prévue :** créer une vue mobile en cartes ou en liste compacte, garder le pseudo et le score visibles, et ajouter une indication claire du défilement si le tableau est conservé.

### P1-06 — Le nombre de tests affiché ne correspond pas aux tests proposés

L’accueil affiche le nombre configuré, mais énumère toujours les sept épreuves : [`templates/home.html`](templates/home.html#L47).

**Impact :** l’utilisateur peut voir « 4 mini-tests » suivi d’une liste de 7 tests, selon la configuration active.
**Correction prévue :** afficher « jusqu’à 7 tests disponibles » ou générer dynamiquement la liste des tests activés.

## Qualité technique et finition

### P2-01 — Tailwind est chargé depuis le CDN en production

[`templates/base.html`](templates/base.html#L7) charge `cdn.tailwindcss.com`. Le navigateur signale que cette méthode est destinée au développement.

**Correction prévue :** compiler une feuille CSS versionnée avec Tailwind CLI/PostCSS et la servir depuis `static/`.

### P2-02 — Grand espace vide sous le footer sur desktop

Le wrapper principal est `min-h-screen` sans structure flex verticale et le `<main>` n’occupe pas l’espace restant : [`templates/base.html`](templates/base.html#L28) et [`templates/base.html`](templates/base.html#L89).

**Correction prévue :** utiliser un conteneur `flex min-h-screen flex-col`, puis donner `flex-1` au contenu principal.

### P2-03 — Le service worker ne remplit jamais son cache

Le service worker ouvre un cache mais ne fait aucun `cache.addAll`, `cache.put` ou équivalent : [`templates/sw.js`](templates/sw.js#L3).

**Impact :** le mode hors-ligne annoncé dans le README ne fonctionne pas réellement pour une première visite hors connexion.

**Correction prévue :** précacher l’app shell et les assets nécessaires, gérer les stratégies réseau par type de ressource, ou retirer la promesse de mode hors-ligne.

### P2-04 — La sélection de texte est désactivée sur tout le site

[`templates/base.html`](templates/base.html#L22) applique `user-select: none` au `body` entier.

**Impact :** impossible de sélectionner/copier les instructions, noms du classement, crédits ou messages d’erreur.
**Correction prévue :** retirer cette règle globale et la limiter éventuellement aux zones de jeu qui en ont réellement besoin.

### P2-05 — Titres de pages trop génériques

Le `<title>` est défini une seule fois dans [`templates/base.html`](templates/base.html#L6), ce qui donne le même titre à l’accueil, au classement, aux crédits, à l’authentification et au JJ HUB.

**Correction prévue :** prévoir un bloc `title` par template, ainsi qu’une description meta adaptée aux pages importantes.

### P2-06 — En-têtes HTTP de sécurité à renforcer

La réponse publique contrôlée contient HSTS, mais pas de CSP, `X-Content-Type-Options`, `Referrer-Policy` ou politique d’encadrement équivalente.

**Correction prévue :** définir ces en-têtes au niveau de l’application ou du reverse proxy, après vérification de la compatibilité avec Google OAuth, les assets et le CDN actuel.

### P2-07 — Documentation fonctionnelle obsolète

Le README décrit encore quatre tests et indique un chemin `static/sw.js`, alors que le service worker est rendu par la route `/sw.js` depuis [`templates/sw.js`](templates/sw.js#L1) et que l’application contient t1 à t7.

**Correction prévue :** mettre à jour les sections française, anglaise et italienne après stabilisation des sept tests.

## Points constatés comme fonctionnels

Lors du contrôle, les pages suivantes se chargeaient correctement : accueil, t1 à t5, résultats, classement, connexion, inscription, crédits et JJ HUB. Le JJ HUB affichait bien les six cartes dans l’ordre attendu. Aucun problème JavaScript bloquant n’a été observé sur ces pages ; le principal avertissement console concernait le CDN Tailwind.

## Checklist de reprise

- [ ] Déployer et tester `t6` et `t7`.
- [ ] Désactiver Flask debug et passer par un serveur WSGI de production.
- [ ] Retirer les identifiants admin affichés et vérifier le changement de mot de passe.
- [ ] Vérifier `SECRET_KEY` sur le serveur et supprimer le fallback `dev-secret`.
- [ ] Sécuriser les POST : CSRF, validation des scores et redirections locales.
- [ ] Repenser le classement mobile.
- [ ] Corriger le texte du nombre de tests.
- [ ] Corriger le footer, la sélection de texte et les titres de pages.
- [ ] Décider entre vrai mode hors-ligne et suppression de la promesse.
- [ ] Compiler Tailwind localement et renforcer les en-têtes HTTP.
- [ ] Mettre à jour le README dans les trois langues.
