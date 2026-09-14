# Journal des changements

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
