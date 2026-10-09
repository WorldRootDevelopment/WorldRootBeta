# Putting WorldRoot on Railway

This takes about half an hour. You need your GitHub account and a card for Railway. Nothing here uses a terminal.

When you are done you will have:

- the site, running all the time at an `https://` address;
- a PostgreSQL database;
- a disk that keeps uploaded pictures;
- sign-in with Discord and Google.

> **This has not been run yet.** The files in the repository (`Dockerfile`, `railway.json`) were written carefully but never built, because the machine they were written on has no Docker and no PostgreSQL. Expect the first deploy to need one or two fixes. If a step fails, copy the red text from Railway's log and bring it back.

## 1. Push the code

Commit and push everything in GitHub Desktop as usual. Check that `apps/web/.env.local` is **not** in the list of changed files. It holds your password and must never be pushed.

## 2. Create the project

1. Go to [railway.com](https://railway.com) and sign in with GitHub.
2. **New Project → Deploy from GitHub repo →** choose `WorldRootBeta`.
3. Railway starts building. It will fail the first time, because the settings below are missing. That is expected.
4. Railway may create two services from the repository, `@worldroot/web` and `@worldroot/worker`. The site is `@worldroot/web`: the disk, the address and every setting below go on that one. Delete `@worldroot/worker`; it has no work to do yet.

## 3. Add the database

1. In the project, **New → Database → PostgreSQL**.
2. Nothing else to do. Railway creates it and gives it a connection address.

## 4. Add a disk for pictures

1. Click the WorldRoot service (the one made from your repo), then **Settings → Volumes → Add Volume**.
2. Mount path: `/data`
3. Size: 1 GB is plenty to start.

## 5. Give the site an address

1. WorldRoot service → **Settings → Networking → Generate Domain**.
2. Copy the address it gives you, for example `https://worldroot-production.up.railway.app`. You need it in the next step and for Discord and Google.

## 6. Enter the settings

WorldRoot service → **Variables**. Add each of these:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (type it exactly; Railway fills in the real address) |
| `BETTER_AUTH_URL` | the address from step 5, with `https://` and no slash at the end |
| `BETTER_AUTH_SECRET` | a long random string of at least 32 characters. Make one at [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32). Changing it later signs everyone out |
| `WORLDROOT_MEDIA_DIR` | `/data/media` |
| `WORLDROOT_CLIENT_IP_HEADER` | `x-real-ip` (lets the site tell visitors apart when limiting sign-in attempts) |
| `WORLDROOT_ADMIN_EMAIL` | the email you will sign in with |
| `WORLDROOT_ADMIN_PASSWORD` | a **new** password, not one you have typed into a chat |
| `WORLDROOT_DONATE_URL` | optional: the `https://` address of your page on a donation service. It becomes the Donate button on `/support` |
| `WORLDROOT_CONTACT_EMAIL` | an address people can write to about their data. It is shown publicly on the privacy policy and the terms |

Leave out `WORLDROOT_ADMIN_PASSWORD_SYNC`. It is for your own computer only and is ignored here.

The demo communities, Demo Town and Demo Dungeon, appear only if you add `WORLDROOT_DEMO` with the value `on`. Your administrator account is made an owner of both. The demo account itself (`host@worldroot.test`) cannot be signed in to unless you also add `WORLDROOT_DEMO_PASSWORD`, at least 10 characters. Anyone who knows that password can act as the owner of the demo communities, so keep it to yourself.

To let anyone try WorldRoot without signing up, also add `WORLDROOT_DEMO_GUEST` with the value `on`. A **Try The Demo** button then appears on the sign-in page and signs people in to one shared guest account, which can write in the two demo communities and make characters and worlds, and nothing else. Remove the setting to close it. If it is being misused, you can also suspend the account `demo_guest` from the Rootwarden portal, which stops it at once.

Railway redeploys when you save. Watch **Deployments**. A green tick means the site is up. Open your address.

The site creates its own database tables each time it starts, so there is nothing to run by hand. In **Deploy Logs** you should see `Database is up to date.` followed by a line about the administrator.

## 7. Switch on Discord sign-in

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → name it WorldRoot.
2. **OAuth2** in the left menu.
3. Under **Redirects**, add: `YOUR-ADDRESS/api/auth/callback/discord`
   (for example `https://worldroot-production.up.railway.app/api/auth/callback/discord`)
4. Copy the **Client ID**. Click **Reset Secret** and copy the **Client Secret**.
5. In Railway → Variables, add `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`.

## 8. Switch on Google sign-in

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project called WorldRoot.
2. **APIs & Services → OAuth consent screen**. Choose **External**, fill in the app name and your email, and save. Add your own email as a test user. While the app is in "Testing", only test users can sign in; press **Publish App** when you want everyone to.
   Where it asks for links, the privacy policy is `YOUR-ADDRESS/privacy`, the terms of service are `YOUR-ADDRESS/terms`, and the home page is `YOUR-ADDRESS`. Discord asks for the same two links under **General Information**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**. Type: **Web application**.
4. Under **Authorized redirect URIs**, add: `YOUR-ADDRESS/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**.
6. In Railway → Variables, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

A "Continue With Discord" or "Continue With Google" button appears on the sign-in page only once both of that provider's values are set.

## 9. Check it

- Open the site. Sign in with the admin email and password from step 6.
- Open **Rootwarden portal** from your account menu to confirm you are staff.
- Upload a profile picture, then in Railway press **Redeploy**. The picture should still be there afterward. If it is gone, the volume in step 4 or `WORLDROOT_MEDIA_DIR` is not right.
- Sign out and try the Discord and Google buttons.

## Trying sign-in on your own computer

Discord and Google will also work with `pnpm dev`. Add a second redirect to each (`http://localhost:3000/api/auth/callback/discord` and `…/google`), and put the four values in `apps/web/.env.local`.

## Your own domain name

Buy one from any registrar. In Railway → Settings → Networking → **Custom Domain**, follow the two steps it shows. Then change `BETTER_AUTH_URL` to the new address and update the redirect in Discord and in Google to match.

## Moving away later

Nothing here ties you to Railway. To move:

- **The site** is the `Dockerfile` in the repository. Any host that runs containers can build it.
- **The database** is ordinary PostgreSQL. Railway's dashboard can make a backup, and any PostgreSQL server can restore it.
- **Pictures** are plain files under `/data/media`. Copy that folder.
- **Settings** are the table in step 6.

## Before strangers arrive

These are not Railway problems, but they should be settled before the address is shared widely:

- There is no email yet, so no "forgot my password". People who sign in with Discord or Google do not need it.
- The world templates use real franchise names and have not had a legal review.
- Uploaded pictures are not scanned automatically.
- Railway keeps backups of the database only if you turn them on. Do.
