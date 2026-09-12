# Journal des changements

## 12 septembre 2026 — JJ HUB, branding et déploiement

### Fonctionnalités

- Ajout d’une page JJ HUB accessible depuis le footer.
- Ajout des six cartes de projets dans l’ordre de référence JJTRONICS : GitHub, JJTRONICS, SondaStream, TestiCool, Guinadi et JsuisDechire.
- Déploiement des sept mini-jeux, dont le réflexe gobelet (t6) et la conduite (t7).

### Identité visuelle

- Logo horizontal complet en couleur, avec fond transparent, dans l’en-tête.
- Taille du logo d’en-tête doublée pour une meilleure visibilité.
- Petit pictogramme placé devant la phrase « Reste en vibe » dans le footer.
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
- Refonte de la page des paramètres admin : en-tête dédié, navigation par sections, champs plus lisibles, état des modifications et barre d’actions persistante.
- Ajout d’un diagnostic SMTP admin : vérification de la connexion, du chiffrement et de l’authentification sans envoi d’email.
- Tailwind compilé localement, validation et limitation des soumissions renforcées, tests automatisés ajoutés.
- Classement et détails de résultats harmonisés dans l’ordre des tests 1 à 7, avec améliorations d’accessibilité et de cache PWA.
- Correction de l’enregistrement des scores : le nombre de paramètres SQL correspond désormais aux 31 colonnes utilisées.

### Documentation

- Audit technique et UX détaillé dans [`AUDIT.md`](AUDIT.md).
- README mis à jour pour les sept tests, le JJ HUB, le branding et le nouveau workflow de déploiement.
