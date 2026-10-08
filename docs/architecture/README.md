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
| 2026-10-07 | Live updates use an in-process publish and subscribe in the web app, feeding a server-sent event stream at `/api/v1/events`. | It makes posts appear at once with no extra infrastructure, and it works on the embedded database. It reaches only browsers connected to the same process, so running more than one web process needs Postgres notifications behind the same `publish` and `subscribe` functions. A 60-second refresh remains as a safety net. |
| 2026-10-07 | Any participant may post narration. | The plan says "Narrator when permitted" without defining it. Restricting narration is left until a community asks for it. |
| 2026-10-07 | Character biographies and world descriptions stay plain text. Only scene posts use the rich text editor. | Converting those fields means a storage change for every long field. Scenes were the priority. |
| 2026-10-07 | A role manager can grant only permissions they hold, and can change, assign or remove only roles ranked below their own highest role. The Owner role is fixed and cannot be assigned or removed. | Without these two rules, anyone with "Manage roles" could promote themselves to full control. The cost is that ownership cannot be transferred yet. |
| 2026-10-07 | Community settings pages return 404, not a refusal, to anyone without an admin permission. | Consistent with the rest of the app: what you may not see does not exist to you. |
| 2026-10-07 | An invite is a link carrying a 12-character random code. Whoever holds it can join, until it expires, is used up or is revoked. | Simple to share anywhere, including Discord, which is where most communities will be recruited from. Invites addressed to a named person can be added later on the same table. |
| 2026-10-07 | A signed-out visitor to an invite link is sent to sign up and returned to the invite afterwards, through a `next` path that only accepts addresses inside the site. | New people arriving by invite are the main way communities will grow. Restricting `next` to local paths prevents the link being used to redirect people elsewhere. |
| 2026-10-07 | Messages are plain text. Scene posts keep the rich text editor to themselves. | The plan wants messaging plainer than scenes so roleplay has a reason to move into a scene. Plain text also keeps messages safe to render with no sanitising step. |
| 2026-10-07 | In a message box Enter sends and Shift+Enter makes a new line. In the scene composer Return always makes a new line. | Each matches what people expect of that kind of box, and the difference reinforces that a scene post is a piece of writing. |
| 2026-10-07 | Anyone can message anyone by handle. The requests inbox and blocks are not built. | They belong to the trust work and must exist before strangers can find each other through Discover and LFRP. |

## Requested, not yet scheduled

Ideas raised by the product owner after the plan was written. None is started.

| Raised | Idea | Notes |
| --- | --- | --- |
| 2026-10-07 | Template worlds, browsable by genre, theme and pop culture | Fits the copy model as it stands: a template is a world anyone may copy into their library, with the lineage pointer back. Needs the tag system from Discovery for the categories. Templates of real franchises are a copyright question for a public launch, so begin with original genre templates. |
| 2026-10-07 | A "DnD mode" for worlds or communities | The plan's Tier 3 "dice and custom RP systems". Likely shape: a switch on a community or scene that enables dice rolls recorded as system posts, numeric stat fields on characters, and a game master role. Custom number fields and the `system` post kind already exist. |
| 2026-10-07 | A company staff portal | The plan's staff console in phase 5: platform reports, account actions, delisting. `platform_role = 'staff'` and the audit log already exist. Needs two-factor sign-in for staff before it ships. |
| 2026-10-07 | A landing page for the project | A minimal one exists at `/` for signed-out visitors. A full marketing page needs the visual identity work the plan runs in parallel. |

## Phase status

| Phase | Status |
| --- | --- |
| 0. Foundations | Done, except Storybook and the worker running against a real PostgreSQL server |
| 1. Library | Mostly: characters, worlds and locations can be created, viewed and edited. Plain text only. Media upload, the rich text editor, deleting, and reordering locations remain. |
| 2. Scenes | Mostly: private and community scenes, in-character posts, narration, a separate out-of-character stream, multi-character, drafts, read position, "waiting on you", lifecycle, invitations by handle. Live updates, editing and removing posts are in. Remaining: mentions, images, tags, the mobile writing mode, the reading view for completed scenes. |
| 3. Communities | Mostly: create a community, general settings, custom roles from the permission registry, role assignment with rank rules, member removal, the character template, character review, adding library worlds, and the audit log viewer. Invite links and bans are in. Remaining: transferring ownership, world-scoped role assignment in the interface, reordering roles and fields. |
| 4. Connection | Started: the messaging engine, direct and group conversations in the Inbox, and the two community spaces. Remaining: the message requests inbox, blocks, reference cards, notifications and email, LFRP, Discover and search. |
