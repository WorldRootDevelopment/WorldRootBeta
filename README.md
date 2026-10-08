# WorldRoot

**Where stories take root.** A platform for text roleplay and collaborative storytelling.

The architecture and build order are in the [Architecture & MVP Plan](docs/architecture/README.md).
This repository is at the end of **phase 0, Foundations**.

## Run it

Requires Node 22 or newer and pnpm (`corepack enable pnpm`).

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

No database install is needed for local development. With `DATABASE_URL` unset, the web app
uses an embedded PostgreSQL (PGlite) stored in `.data/pglite` and migrates it on start.
Delete `.data/` to start from an empty database.

The embedded database also loads a demo community on start: **Demo Town**, a small ordinary town with a single Narrator character, at
http://localhost:3000/c/demo-town. Any account can browse and join it. To see it as its owner, sign in as
`host@worldroot.test` with the password `welcome-to-demo-town`. Set `WORLDROOT_DEMO=off` to skip it.
The demo account has a published password, so the demo must not run on a public deployment.

To use a real PostgreSQL server, copy `.env.example` to `apps/web/.env.local`, set
`DATABASE_URL`, then run `pnpm db:migrate`.

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | Runs the web app |
| `pnpm lint` | ESLint, including the package boundary rules |
| `pnpm typecheck` | Type-checks every package |
| `pnpm test` | Runs service tests against an in-memory database |
| `pnpm build` | Production build of the web app |
| `pnpm db:generate` | Generates a migration from schema changes |
| `pnpm db:migrate` | Applies migrations to the database in `DATABASE_URL` |
| `pnpm --filter @worldroot/worker start` | Runs the outbox worker (needs a real PostgreSQL server) |

## Layout

```
apps/
  web/        Next.js: pages, /api/v1 route handlers, features by domain module
  worker/     Outbox consumers and, later, scheduled jobs
packages/
  core/       Domain modules and services. The only package apps call for data.
  db/         Drizzle schema, migrations, database connection
  contracts/  Zod schemas, event types, permission registry. Safe for the browser.
  ui/         Design tokens, themes, shared components
  config/     Shared TypeScript configuration
```

Three rules are enforced by lint: apps never import `db`; `contracts` and `ui` never import
`core` or `db`; all data access goes through `core` services.

## Conventions

- A service that changes state takes an `Actor`, checks permission, and writes its audit entry
  and outbox event in the same transaction as the change.
- Permission keys live in `packages/contracts/src/permissions.ts`. Granting is data; the keys are code.
- Components use semantic colour tokens (`bg-surface`, `text-ink`, `bg-accent`) and never a raw colour.
