# Architecture

The reviewed plan lives here: [WorldRoot Architecture & MVP Plan](https://claude.ai/code/artifact/cc9bf113-c637-4f1f-9e13-183f015e00cc).

Decisions that differ from the plan, or that the plan left open, are recorded below as they are made.

## Decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-10-07 | Local development and tests run on PGlite, an in-process PostgreSQL, when `DATABASE_URL` is unset. | No Docker or PostgreSQL install is needed to run the app or the tests. Production uses a PostgreSQL server through the same Drizzle schema and migrations. |
| 2026-10-07 | The outbox is drained by a polling loop in `apps/worker` using `FOR UPDATE SKIP LOCKED`. pg-boss is deferred until scheduled jobs are needed. | The loop is a few dozen lines, is tested, and works on both database drivers. pg-boss needs a real server and adds nothing until there are scheduled jobs. |
| 2026-10-07 | Handle and adult confirmation are collected in an onboarding step after sign-up, not on the sign-up form. | OAuth sign-ups cannot carry custom fields, so one onboarding step serves every sign-in method. |
| 2026-10-07 | Email verification is not yet enforced. | No email provider is chosen. It must be enforced before any public launch. |
| 2026-10-07 | TypeScript is pinned to 6.x and Next.js to 16.3.x. | typescript-eslint does not yet support TypeScript 7. Next.js 16.4.0 was a day old and failed pnpm's release-age policy. |
| 2026-10-07 | A first slice of communities, roles, worlds, locations and characters was built ahead of phase 2, read-only in the interface, to support a demo community. | A browsable demo was wanted before the scene engine. The services, the copy model and the permission checks are real and tested; the create and edit screens are not built. |
| 2026-10-07 | The embedded database seeds the Star Trek demo community when the web app starts. | The embedded database is single-process, so a separate seed command cannot run beside the dev server. It must not ship to a public deployment: it uses a real franchise setting and a published password. |
| 2026-10-07 | Locations use a parent id only. The `ltree` path column is deferred. | A world's locations are loaded whole and arranged in memory, which is enough until scenes need subtree queries. |
| 2026-10-07 | The server validates and renders rich text with its own small module in `packages/editor`, not with TipTap. | The document schema is a short allowlist, so a hand-written validator and renderer is under 200 lines, needs no DOM on the server, and is safe by construction. TipTap runs in the browser only, configured to produce the same schema. |
| 2026-10-07 | An open scene refreshes on a 15-second timer while its tab is visible. | A stand-in so two writers see each other's posts without reloading. The server-sent event stream from the plan replaces it. |
| 2026-10-07 | Any participant may post narration. | The plan says "Narrator when permitted" without defining it. Restricting narration is left until a community asks for it. |
| 2026-10-07 | Character biographies and world descriptions stay plain text. Only scene posts use the rich text editor. | Converting those fields means a storage change for every long field. Scenes were the priority. |

## Phase status

| Phase | Status |
| --- | --- |
| 0. Foundations | Done, except Storybook and the worker running against a real PostgreSQL server |
| 1. Library | Mostly: characters, worlds and locations can be created, viewed and edited. Plain text only. Media upload, the rich text editor, deleting, and reordering locations remain. |
| 2. Scenes | Mostly: private and community scenes, in-character posts, narration, a separate out-of-character stream, multi-character, drafts, read position, "waiting on you", lifecycle, invitations by handle. Remaining: the live event stream, editing and removing posts, mentions, images, tags, the mobile writing mode, the reading view for completed scenes. |
| 3. Communities | Partly: schema, roles, joining, world and character copying, custom fields, read pages. Settings, roles interface and approval remain. |
