# Futurs mini-jeux

Ce document conserve les idées validées pour de futurs mini-jeux. Une idée n'est pas une décision d'implémentation : préciser son gameplay, ses réglages admin, ses textes i18n, son mode de secours et ses tests avant de la développer.

## t12 — Niveau à bulles

**Concept :** le joueur incline son téléphone pour placer une bulle au centre d'un niveau circulaire, puis la maintient stable pendant une courte durée.

**Capteurs :** `DeviceOrientationEvent` en priorité ; utiliser les accélérations si disponibles pour détecter les secousses. Demander l'autorisation sur iOS au déclenchement explicite d'un bouton « Activer les capteurs ».

**Boucle de jeu :**

1. Afficher un niveau circulaire avec une zone centrale.
2. Le joueur incline doucement son téléphone pour centrer la bulle.
3. Le compteur progresse tant que la bulle reste dans la zone.
4. Une inclinaison trop forte ou une secousse interrompt le maintien.
5. La manche se termine après 8 à 12 secondes de stabilité cumulée, selon les réglages.

**Score :** combiner le temps stable, l'écart moyen entre la bulle et le centre, et le nombre de sorties de zone. Afficher ces éléments dans les détails de résultat.

**Mode de secours obligatoire :** sur ordinateur, si le capteur est indisponible ou si l'autorisation est refusée, permettre de déplacer la bulle au clavier et au glisser-déposer. Le score doit rester comparable au mode capteur.

**Carte de sélection :** vignette cartoon carrée : smartphone turquoise légèrement incliné, cercle de niveau avec grosse bulle verte presque centrée, petites étoiles dorées et traits de mouvement. Sans texte dans l'illustration ; le titre de la carte est « Niveau à bulles ».

**Pré-requis avant réalisation :**

- ajouter l'activation admin et les paramètres dans `DEFAULT_SETTINGS` ;
- ajouter les traductions françaises, anglaises et italiennes ;
- garantir le passage automatique au jeu suivant via `jsd:done:t12` ;
- tester sur iOS, Android et sans capteur ;
- ajouter au moins un test de flux dans `tests/core-flow.test.js`.

## t11 — Dino Dash (livré)

Le jeu de course avec saut réel demandé est disponible dans `/t11`. Il utilise `DeviceMotionEvent` après une activation explicite, détecte les impulsions de mouvement pendant la course, propose un mode tactile de secours, et reste désactivé par défaut dans l'administration.
