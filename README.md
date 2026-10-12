# Log Viewer

Interface web de suivi de logs en temps réel, conçue pour permettre à un technicien d’identifier rapidement les erreurs, lenteurs et requêtes associées sans avoir à parcourir du JSON brut.

## Lancement avec Docker

Prérequis : Docker et Docker Compose.

Créer le fichier de configuration :

```bash
cp .env.example .env
```

Renseigner dans `.env` l’URL de l’API, sans slash final :

```dotenv
VITE_LOGS_API_URL=https://logs.example
```

Construire et démarrer l’application :

```bash
docker compose up --build
```

L’interface est ensuite disponible sur [http://localhost:8080](http://localhost:8080).

Pour utiliser un autre port :

```bash
PORT=3001 docker compose up --build
```

L’URL de l’API est intégrée au JavaScript lors de la construction de l’image. Une modification de `.env` nécessite donc de reconstruire l’image.

## Développement local

Prérequis : Node.js 24.21.0 (indiqué dans `.nvmrc`).

```bash
nvm use
cp .env.example .env
npm ci
npm run dev
```

Après avoir renseigné `VITE_LOGS_API_URL` dans `.env`, l’application est accessible à l’adresse affichée par Vite, généralement [http://localhost:5173](http://localhost:5173).

## Choix fonctionnels

La consigne était de réaliser une interface web capable de lire les logs envoyés par une API, et permettant de les afficher en direct et de les analyser.

Comme l'objectif était de privilégier la qualité à la quantité, et que le temps de réalisation était limité, j'ai choisi de me limiter à un projet uniquement frontend, avec une page qui rassemble l'ensemble des fonctionnalités :

- Réception en temps réel des logs fournis par l'API
- Affichage des logs dans un tableau, avec mise en évidence des informations importantes (erreurs, requêtes lentes)
- Filtrage des données via une combinaison de critères adaptés
- Graphique des logs en direct, avec configuration de l'affichage (granularité, regroupements, zoom temporel)
- Mise en pause de l'affichage, avec compteur de nouveaux logs reçus
- Panneau de détails d'un log, avec accès au JSON brut
- Export CSV des logs filtrés
- Sauvegarde des préférences utilisateur dans le navigateur
- Reconnexion automatique en cas d’interruption du flux

## Compromis et limites

### Persistance des données

L'app étant uniquement frontend, les données ne sont pas persistées. Elles ne sont présentes que dans la mémoire du navigateur, et sont perdues si on ferme la page ou que l'app s'arrête.

De plus, comme toutes les opérations sont gérées par le navigateur, j'ai limité à 5000 le nombre de logs que l'app peut stocker (environ 8 minutes de logs) afin que l'app reste fluide.

Cette contrainte serait difficilement acceptable dans un cas réel d'utilisation, car on a potentiellement besoin de pouvoir consulter l'historique des logs plusieurs heures ou jours en arrière. C'est pourquoi, avec plus de temps sur le projet, la gestion de la persistance des données (via un backend et une base de données) est selon moi la fonctionnalité la plus importante à ajouter au projet.

### Interface

L’interface est conçue pour un écran d’ordinateur, et uniquement en thème sombre. Elle est utilisable sur téléphone, mais elle n’est pas optimisée pour ce format. Un thème clair pourrait être ajouté plus tard.

## Choix techniques

J'ai choisi d'utiliser React car c'est le framework frontend que je maîtrise le mieux. TypeScript permet de sécuriser les types des variables pour éviter les erreurs à l'exécution.

Pour lire les logs de l'API, j'ai utilisé le flux NDJSON avec `fetch`, qui permet de gérer facilement les reconnexions après avoir reçu une erreur 503 avec un `Retry-After`.

J'ai regroupé les logs reçus par séquences de 200 ms, pour réduire le nombre de rendus React (5 par seconde). Le tableau des logs est virtualisé via Tanstack Virtual : on n'affiche dans le DOM que les lignes affichées à l'écran, pour gagner en performance lors de l'affichage.

Le graphique est réalisé directement en SVG, sans utiliser de bibliothèque dédiée, afin d'avoir un affichage précis et des interactions spécifiques (survol et zoom sur une période en glissant).

Le projet comporte plusieurs scripts pour s'assurer de la qualité du code (`format`, `lint`, `typecheck`, `test`, `build`). Ces scripts sont exécutés avant chaque commit et pull request. Des tests unitaires sont présents sur les fichiers essentiels de l'app afin de détecter d'éventuelles régressions.
