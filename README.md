# Log viewer

Interface web pour suivre des logs en temps réel.

## Lancer avec Docker

Prérequis : Docker Desktop ou Docker Engine avec Docker Compose.

1. Créer la configuration :

```bash
cp .env.example .env
```

Renseigner dans `.env` l'URL de base de l'API, sans slash final :

```dotenv
VITE_LOGS_API_URL=http://localhost:3000
```

2. Construire et lancer le build de production :

```bash
docker compose up --build
```

L'application est disponible sur http://localhost:8080. Pour utiliser un autre
port, définir `PORT`, par exemple `PORT=3001 docker compose up --build`.

Vite intègre l'URL dans le JavaScript pendant la construction de l'image.

### Sans Docker Compose

```bash
docker build -t log-viewer \
  --build-arg VITE_LOGS_API_URL=http://localhost:3000 .
docker run --rm -p 8080:80 log-viewer
```

Dans un conteneur, `localhost` désigne le conteneur lui-même. Ici, l'URL est
appelée par le navigateur : elle doit donc être accessible depuis la machine
qui ouvre l'application et l'API doit autoriser son origine (CORS).

## Développement local

Prérequis : Node.js 24.21.0. Avec nvm : `nvm use` (la version est dans
`.nvmrc`).

```bash
cp .env.example .env
npm ci
npm run dev
```

Renseigner `VITE_LOGS_API_URL` dans `.env`. Ce fichier n'est pas versionné.

## Scripts

| Script                 | Rôle                                              |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Serveur de développement                          |
| `npm run build`        | Vérification TypeScript, puis build de production |
| `npm run preview`      | Sert le build localement                          |
| `npm run lint`         | ESLint                                            |
| `npm run typecheck`    | `tsc -b`, sans émettre de fichiers                |
| `npm run test`         | Vitest, une fois                                  |
| `npm run format`       | Prettier, réécrit les fichiers                    |
| `npm run format:check` | Prettier, vérifie le formatage sans réécrire      |
| `npm run check`        | Format, lint, typecheck, tests et build           |

`git commit` lance `npm run check`. Un échec bloque le commit. La CI (`.github/workflows/ci.yml`) exécute le même script.
