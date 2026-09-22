# Running AutoLinkX locally

Everything here runs on your machine. No hosted Supabase project is involved,
no credentials leave the laptop, and no command in this guide touches a
deployed environment.

Scope note: the accounts milestone is implemented. There are no car listings
yet, so browsing, search and the seller dashboard are not built.

## 1. Prerequisites

| Requirement | Why | Check |
| --- | --- | --- |
| Node.js 24 (see `.nvmrc`) | The app pins this major version | `node -v` |
| npm 11 | Ships with Node 24 | `npm -v` |
| Docker, running | Local Supabase runs in containers | `docker info` |
| ~5 GB free disk | Supabase images plus build output | `df -h` |

Docker Desktop must actually be **started**, not just installed — `supabase
start` fails with a socket error otherwise.

## 2. Install

```sh
npm ci
```

Use `npm ci`, not `npm install`: it installs exactly what the lockfile pins.

## 3. Start the database

```sh
npm run db:start
```

The first run downloads several container images and takes a few minutes.
Afterwards it is seconds.

This project's ports are **offset from the Supabase defaults** so the stack can
run beside another local Supabase project:

| Service | Address |
| --- | --- |
| API gateway | <http://127.0.0.1:54421> |
| PostgreSQL | `postgresql://postgres:postgres@127.0.0.1:54422/postgres` |
| Studio (database UI) | <http://127.0.0.1:54423> |
| Mail catcher | <http://127.0.0.1:54424> |

**Every email the app sends lands in the mail catcher.** Nothing is delivered
to a real address, which is what makes it safe to register with any address you
like.

## 4. Configure the environment

```sh
cp .env.example .env.local
npx supabase status
```

Copy the printed values into `.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `SUPABASE_URL` | `API URL` |
| `SUPABASE_PUBLISHABLE_KEY` | `publishable key` |
| `SUPABASE_SECRET_KEY` | `secret key` — server only, never `NEXT_PUBLIC_` |
| `APP_URL` | `http://localhost:3000` |
| `MARKETPLACE_CURRENCY` | `PHP` |

`.env.local` is git-ignored. Treat `supabase status` output as a credential:
keep it out of issues, screenshots and chat.

**The app will not start without this file.** Startup validation fails loudly
rather than serving pages with half a configuration — the error names the
variable that is missing.

## 5. Apply migrations

```sh
npm run db:migrate:local
```

Applies only pending migrations and preserves existing data. `npm run db:start`
already does this on a fresh stack, so you need it after pulling new
migrations.

## 6. Run the app

```sh
npm run dev
```

Open <http://localhost:3000>.

> **Turn off browser extensions, or use a private window.** Form-filling and
> password-manager extensions inject attributes into inputs before React loads,
> which breaks hydration and leaves forms silently unresponsive. This is not an
> application bug, but it will waste your afternoon.

## 7. Walk the account journey

1. Go to **Create account** and register with any address, for example
   `you@example.test`.
2. Open the mail catcher at <http://127.0.0.1:54424> and click the confirmation
   link in the newest message.
3. You land on **Your profile**, signed in. The header now shows your name.
4. Add a location and a contact email, tick *Show this email on my listings*,
   and save. Only the values you ticked become public; your sign-in address
   never does.
5. Sign out from the header, then use **Forgot your password?** to receive a
   recovery link in the mail catcher.

## 8. Checks

```sh
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run build       # production build
```

Integration tests need the local stack and `.env.local`; they **skip
themselves** when Supabase is unreachable, so a green run with the stack down
proves less than it looks. Start Supabase before trusting them.

If `npm run typecheck` reports errors inside `.next/`, delete that directory:
`next dev` and `next build` write different route-type artifacts and the stale
set is type-checked too.

## 9. Everyday commands

| Command | Does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run db:start` | Start local Supabase |
| `npx supabase stop` | Stop it; data survives in volumes |
| `npm run db:migrate:local` | Apply pending migrations |
| `npm run db:types` | Regenerate `src/server/database.types.ts` after a schema change |
| `npx supabase status` | Show local URLs and keys |

Commit regenerated types together with the migration that changed them, so the
two cannot drift.

## 10. When something is wrong

| Symptom | Cause and fix |
| --- | --- |
| `failed to connect to the docker API` | Docker Desktop is not running. Start it and retry. |
| `supabase start` hangs or Docker stops responding | Usually a full disk. Free space, then restart Docker Desktop. |
| Port already allocated | Another Supabase project holds the default ports. This project uses 544xx; check `supabase/config.toml` if you changed them. |
| App exits naming a variable | `.env.local` is missing or incomplete. Re-copy from `.env.example`. |
| A form does nothing when submitted | A browser extension broke hydration. Try a private window. |
| No confirmation email arrives | Look in the mail catcher, not a real inbox. |
| `Invalid schema: app_private` | Intended. That schema is deliberately unreachable through the API; use the exposed functions. |

## 11. Never point this at a hosted project

Every database command here passes `--local`, and the repository is **not
linked** to any hosted Supabase project. Do not run `supabase link` to
experiment: a migration command aimed at a real project is not reversible by
re-running it. Hosted environments are a separately authorised task (A-23).
