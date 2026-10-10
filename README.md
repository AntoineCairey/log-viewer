# Log viewer

Interface web pour suivre des logs en temps réel.

## Prérequis

Node.js 24.21.0. Avec nvm : `nvm use` (la version est dans `.nvmrc`).

## Lancer le projet

```bash
cp .env.example .env
npm install
npm run dev
```

Renseigner `VITE_LOGS_API_URL` dans `.env` (URL de base de l'API, sans slash final). Ce fichier n'est pas versionné.

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

La CI (`.github/workflows/ci.yml`) enchaîne format, lint, typecheck, tests et build.

## État

Cette branche pose l'outillage. Le flux de logs, l'interface et les compromis (plafond mémoire, fréquence de mise à jour, transport) seront décrits ici au fil des étapes suivantes.
