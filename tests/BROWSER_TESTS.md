# Parcours complets des jeux

Ces contrôles chargent les vrais templates Flask et les vrais scripts de jeu.
Le navigateur termine les parties par des clics, des gestes ou leur durée prévue.
Il ne fabrique aucun score et ne pose aucun marqueur de fin pour le jeu testé.
Les données des capteurs d’Équilibre sont simulées ; le mode tactile est également
testé avec un doigt maintenu immobile pendant toute la mesure.

Prérequis : Python 3.12 avec Flask, Node avec WebSocket global, Google Chrome.
Le chemin de Chrome peut être précisé via `CHROME_PATH`.

Depuis la racine, lancer dans deux terminaux :

```sh
python3.12 tests/browser_training_server.py 4177
node tests/training-browser.mjs http://127.0.0.1:4177 both
```

Le serveur utilise une base SQLite temporaire et réduit les durées/nombres de
manches. Il ne modifie pas la base de l’application. Le navigateur utilise un
profil temporaire et le script refuse les serveurs autres que localhost.

Le parcours vérifie :

- les onze jeux en entraînement, score affiché égal au résultat du jeu ;
- le maintien de l’écran de score et le bouton de retour à `/training` ;
- le bouton « Rejouer » pour chaque jeu : remise à zéro de l’entraînement,
  deuxième partie complète et nouvel écran de score avant le retour ;
- l’absence de soumission au classement en entraînement ;
- les onze fins de jeu en partie normale, avec navigation automatique vers le
  jeu suivant ou les résultats ;
- Équilibre aux capteurs et au doigt, dans les deux modes ;
- les exceptions JavaScript.

Les captures d’écran sont conservées dans le répertoire temporaire indiqué
à la fin du contrôle. Les options `training` et `normal` permettent de ne lancer
qu’un des deux parcours. Ce test local ne certifie pas la version déployée :
le déploiement doit aussi vérifier la présence de `static/js/training.js`.
