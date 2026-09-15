# Journal des changements

## 16 septembre 2026 — Dino Dash, entraînement et gestion du dernier score

### Expérience joueur

- Ajout de Dino Dash (t11), un jeu de course où le téléphone détecte les vrais sauts ; les sauts courts et longs sont distingués selon la durée du mouvement ou de l'appui tactile de secours.
- Ajout de la page `/training`, accessible depuis l'accueil, qui permet de tester tous les mini-jeux. Les jeux désactivés dans l'administration restent visibles avec un badge bêta et ne sont pas ajoutés aux parties officielles.
- Remplacement du bouton « Me surprendre » par une carte cartoon de tirage aléatoire, numérotée 01 ; les jeux commencent à la carte 02.
- Les obstacles de Dino Dash sont désormais illustrés (bières et personnages) et suivent une génération moins prévisible, avec une notation qui pénalise réellement les cactus touchés au fil de la partie.
- Les joueurs connectés peuvent supprimer leur dernier score depuis les résultats ou leur profil. La limite est de 3 suppressions par jour par défaut, configurable dans l'administration ; `0` désactive la fonctionnalité.
- Le profil affiche désormais les 11 mini-jeux dans son historique, et les tableaux global et personnel utilisent des en-têtes de jeux verticaux pour gagner de la largeur sans sacrifier la lisibilité.

### Technique

- La suppression est limitée au dernier score appartenant au compte connecté, journalisée côté serveur et protégée par une transaction SQLite avec quota quotidien.
- Ajout des traductions FR/EN/IT, des tests backend/JavaScript et des assets de marque nécessaires à Dino Dash et à l'entraînement.

## 15 septembre 2026 — Renforcement comptes, sessions et administration

- Limitation des tentatives de connexion joueur/admin, d'inscription et de récupération de mot de passe, avec réponses qui ne divulguent plus si un compte existe ou s'il utilise Google.
- Renouvellement de l'état de session à chaque authentification et révocation des autres sessions lors d'un changement de mot de passe ; le même principe s'applique aux sessions admin après rotation du mot de passe.
- Journal d'audit admin borné aux 200 derniers événements consultables, ne contenant ni secret ni adresse IP en clair.
- En-têtes HTTP renforcés (anti-iframe, isolation cross-origin, HSTS uniquement en HTTPS, non-mise en cache des écrans sensibles) et service systemd davantage cloisonné.
- Correctif PWA/session : les pages HTML ne sont plus précachées et l’état de compte est relu depuis `/api/session` avant le démarrage d’une partie.
- Correctif de déploiement : le script refuse désormais de terminer si le PID Gunicorn n’a pas été remplacé après le redémarrage systemd.

## 15 septembre 2026 — Refonte cartoon des mini-jeux

### Réaction, Stroop & mobile

- Le Test 1 · Réaction devient un vrai bouton cartoon carré : surface orange pendant l’attente, passage au vert au signal, reflets, socle sombre, ombre portée et effet d’enfoncement au toucher.
- Le Test 2 · Stroop reprend l’univers des cartes de peinture du logo : carte centrale pour le mot affiché, six cartes de couleurs tactiles avec relief, éclaboussures et animations d’appui.
- Le bouton de démarrage Stroop revient au design global du site pour garder une hiérarchie claire.
- Suppression des pictogrammes décoratifs des en-têtes de mini-jeux afin de libérer de l’espace sur smartphone.

## 15 septembre 2026 — Sélection des jeux admin par cartes

### Administration & UX mobile

- Remplacement des cases à cocher de l’onglet « Sélection des jeux » par la grille de cartes cartoon déjà utilisée côté joueur.
- Activation et désactivation d’un mini-jeu en cliquant directement sur sa carte, avec coche verte, état lisible et compteur des jeux actifs.
- Conservation des réglages du nombre de jeux tirés par partie, du choix des jeux par le joueur et des évaluations joueurs sous la grille.
- Interface adaptée aux écrans tactiles et aux petits écrans.

## 15 septembre 2026 — Finalisation de l’espace d’administration

### UX, sécurité et documentation

- Déplacement de la section « Identifiants d’accès » après les réglages par espace pour conserver une hiérarchie cohérente dans l’onglet « Compte & email ».
- Remplacement de toutes les confirmations, saisies et alertes natives restantes de l’administration par des modales intégrées au thème clair/sombre.
- Documentation du parcours complet : onglets de paramètres, éditeur de scores, actions globales en bas de page, feedbacks regroupés par votant et métriques par mini-jeu.

## 15 septembre 2026 — Taux de présence des mini-jeux

### Administration

- Ajout du nombre de parties dans lesquelles chaque mini-jeu a été joué, rapporté au nombre total de parties enregistrées.
- Ajout d’une barre de participation dans les cartes de synthèse des avis.

## 15 septembre 2026 — Moyenne globale des mini-jeux

### Administration

- Chaque carte « Avis sur les mini-jeux » affiche désormais la moyenne de score du mini-jeu, calculée sur tous les scores disponibles en base.
- La moyenne est représentée par une barre de progression et indique la note sur 100.

## 15 septembre 2026 — Suppression ciblée des votes joueurs

### Administration

- Ajout d’un bouton de suppression sur chaque mini-jeu évalué dans le tableau des retours.
- La suppression retire uniquement le vote du mini-jeu choisi, sans effacer les autres avis de la même partie.

## 15 septembre 2026 — Suppression des scores sécurisée

### Administration & UX

- Déplacement de « Vider tous les scores » dans l’onglet « Édition des scores ».
- Remplacement de la confirmation native par une modale claire avec saisie obligatoire du mot de confirmation avant validation.

## 15 septembre 2026 — Édition des scores dans le menu admin

### Administration & UX

- Ajout d’un onglet principal « Édition des scores » qui ouvre directement le tableau des scores.
- Suppression du bouton d’édition des scores de la barre d’actions sticky en bas de page.

## 15 septembre 2026 — Accès direct aux scores et retours

### Administration & UX

- Les actions « Éditer les scores » et « Voir les retours » quittent la barre sticky globale et rejoignent l’onglet « Scores & retours ».
- L’ouverture de cet onglet affiche et charge automatiquement les deux tableaux, puis positionne la page au bon endroit.

## 15 septembre 2026 — Paramètres admin organisés par onglets

### Administration & UX

- Remplacement de la longue liste de réglages par quatre espaces : partie & expérience, mini-jeux, compte & email, scores & retours.
- Ajout d’un sous-onglet tactile pour les mini-jeux afin d’afficher un seul panneau de calibration à la fois.
- Toutes les options restent présentes dans le formulaire et continuent d’être sauvegardées ensemble, même lorsqu’un onglet est masqué.
- Ajout de repères d’onglet accessibles, d’un état actif visuel et d’une navigation persistée dans l’URL pour retrouver directement un réglage.

## 15 septembre 2026 — Tableau des votes enrichi

### Administration

- Ajout du login utilisateur dans les derniers votes, avec gestion des retours anonymes.
- Ajout d’une date de vote explicite et filtrable.
- Tri renforcé sur toutes les colonnes avec indicateurs visuels et indication de clic.
- Regroupement des mini-jeux d’une même soumission sur une seule ligne par votant et par partie.

## 15 septembre 2026 — Parcours sans rejouer une épreuve

### UX

- Suppression des boutons « Rejouer » affichés après la fin d’un mini-jeu.
- Le jeu des gobelets, le beer pong, la conduite, la mémoire, le glaçon fou et le barman précis avancent désormais directement vers l’étape suivante ou le score final.
- Les manches internes prévues dans un mini-jeu restent disponibles jusqu’à leur fin normale.

## 14 septembre 2026 — Retours facultatifs après la partie

### Fonctionnalités

- Le formulaire d’avis n’apparaît qu’après le score final et reste entièrement facultatif via le bouton « Évaluer les jeux ».
- Le joueur peut noter chaque mini-jeu joué avec 1 à 5 étoiles et qualifier la difficulté : trop facile, parfaite ou trop difficile.
- Chaque carte rappelle le score obtenu pour le mini-jeu évalué.
- Les retours sont enregistrés dans une table dédiée avec protection contre les doublons d’une même partie.
- L’administration dispose d’un tableau des votes triable et filtrable, ainsi que d’une synthèse par jeu avec moyenne, répartition de difficulté et recommandation de réglage.
- Les recommandations renvoient directement vers les paramètres du mini-jeu concerné.
- Ajout d’un interrupteur admin pour activer ou désactiver entièrement les évaluations joueurs.
- Traductions ajoutées en français, anglais et italien.

### Vérification

- 12 tests Flask passent.
- La syntaxe de tous les fichiers JavaScript passe avec `npm run test:js`.
- Aucun déploiement n’a été lancé pour cette évolution.

## 14 septembre 2026 — Sélection des jeux avant la partie

### Fonctionnalités

- Ajout d’un réglage admin pour laisser le joueur choisir les mini-jeux utilisés dans sa partie.
- Ajout de la page `/select-games` avec grille tactile, sélection/désélection, compteur du nombre requis et tirage aléatoire.
- Respect de la liste des jeux activés et de `session_total_games`, avec conservation de la séquence dans `localStorage`.
- Ajout d’un sprite illustré cartoon pour les cartes de jeu, optimisé pour les petits écrans.
- Traductions du parcours ajoutées en français, anglais et italien.

### Documentation

- README complété avec le parcours de sélection, le réglage admin et les nouveaux assets.

## 12 septembre 2026 — JJ HUB, branding et déploiement

### Fonctionnalités

- Ajout d’une page JJ HUB accessible depuis le footer.
- Ajout des six cartes de projets dans l’ordre de référence JJTRONICS : GitHub, JJTRONICS, SondaStream, TestiCool, Guinadi et JsuisDechire.
- Déploiement des sept mini-jeux, dont le réflexe gobelet (t6) et la conduite (t7).

### Identité visuelle

- Logo horizontal complet en couleur, avec fond transparent, dans l’en-tête.
- Taille du logo d’en-tête doublée pour une meilleure visibilité.
- Petit pictogramme placé devant la phrase « Reste en vibe » dans le footer.
- Petit pictogramme du footer exporté avec un vrai fond transparent pour s’intégrer proprement au dégradé.
- Pictogramme officiel utilisé dans la carte JsuisDechire du JJ HUB.
- Favicon et icônes PWA remplacés par des assets de marque aux dimensions attendues.

### Déploiement

- Ajout de [`deploy.sh`](deploy.sh), configurable via `.env.deploy`.
- Archive sans base SQLite, secrets, environnement virtuel ni uploads locaux.
- Backup distant automatique avant chaque déploiement.
- Vérification systemd, des fichiers t6/t7, des logos et des routes HTTP après mise en ligne.
- Renforcement production : Gunicorn, clé de session dédiée, CSRF, en-têtes de sécurité et filtrage des réglages publics.
- Refonte mobile du classement en cartes détaillables, clarification du texte d’accueil et précache du service worker.
- Ajout de descriptions courtes pour clarifier chaque mini-jeu dans l’administration.
- Réorganisation des réglages admin dans l’ordre des tests 1 à 7.
- Ajout d’un bouton de test live sur chaque mini-jeu : l’aperçu s’ouvre dans un nouvel onglet avec les réglages affichés, sans sauvegarde ni pollution de la progression réelle.
- Refonte de la page des paramètres admin : en-tête dédié, navigation par sections, champs plus lisibles, état des modifications et barre d’actions persistante.
- Ajout d’un diagnostic SMTP admin : vérification de la connexion, du chiffrement et de l’authentification sans envoi d’email.
- Sécurisation des paramètres SMTP : le mot de passe n’est plus injecté dans la page admin et reste inchangé si le champ est vide.
- Durcissement de l’authentification admin : suppression du mot de passe par défaut connu et rotation du secret de production.
- Validation cohérente des seuils, durées et pondérations avant sauvegarde, avec avertissement en cas de modifications non enregistrées et retour aux valeurs sauvegardées.
- Ajout d’un envoi d’email de test vers une adresse explicitement saisie.
- Suppression des anciennes variantes JavaScript t3/t4 non référencées ; les versions actives restent `t3.v156.js` et `t4.v157.js`.
- Le bouton SMTP distingue désormais le diagnostic de connexion d’un envoi d’email de test vers un destinataire explicitement saisi.
- Intégration GA4 via `GOOGLE_ANALYTICS_ID` avec Consent Mode v2 régionalisé, refus persistant et lien de gestion des préférences ; les pages admin sont exclues.
- Tailwind compilé localement, validation et limitation des soumissions renforcées, tests automatisés ajoutés.
- Classement et détails de résultats harmonisés dans l’ordre des tests 1 à 7, avec améliorations d’accessibilité et de cache PWA.
- Correction de l’enregistrement des scores : le nombre de paramètres SQL correspond désormais aux 31 colonnes utilisées.

### Documentation

- Audit technique et UX détaillé dans [`AUDIT.md`](AUDIT.md).
- README mis à jour pour les sept tests, le JJ HUB, le branding et le nouveau workflow de déploiement.
- Consent Mode Google v2 régionalisé pour GA4 : refus par défaut dans l’EEE, au Royaume-Uni et en Suisse, autorisation ailleurs, avec acceptation/refus complets depuis la bannière.

## 15 septembre 2026 — Dino Dash, saut réel

- Ajout du mini-jeu t11 : une course type endless runner où le joueur saute réellement avec son téléphone en main pour faire bondir le dino.
- Détection via DeviceMotionEvent avec activation explicite, mode tactile/clavier de secours, difficulté progressive, collisions, score distance/précision et détails enregistrés.
- Ajout du logo cartoon Dino Dash dans les cartes de sélection ; le jeu est désactivé par défaut dans l’administration.
- Refonte du saut avec une trajectoire physique naturelle, dino orienté dans le sens de la course et obstacles générés en patterns variés (tailles, doubles cactus, intervalles imprévisibles).
- Ajout d’un mode entraînement accessible depuis l’accueil, avec uniquement les jeux actifs dans l’administration et un stockage isolé pour que les essais ne modifient pas la vraie partie.
