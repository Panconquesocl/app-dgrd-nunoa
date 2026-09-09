# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # development server at localhost:3000
pnpm build        # production build
pnpm lint         # ESLint
pnpm format       # Prettier (write)
pnpm format:check # Prettier (check only)
pnpm commit       # commitizen interactive commit
```

### Database (Docker + Prisma)

```bash
docker compose up -d                 # start local PostgreSQL (container dgrd-nunoa-db, port 5432)
docker compose down                  # stop it (add -v to also wipe the volume/data)
pnpm prisma migrate dev --name <n>   # create + apply a migration in dev
pnpm prisma generate                 # regenerate the client into src/generated/prisma
pnpm prisma studio                   # browse the data
pnpm db:seed                         # create the initial admin (ADMIN_EMAIL / ADMIN_PASSWORD)
```

After editing `src/lib/auth.ts` (Better Auth config), regenerate the auth models into the schema before migrating:

```bash
npx @better-auth/cli generate --config src/lib/auth.ts --output prisma/schema.prisma -y
```

Copy `.env.example` to `.env` and fill in the values before running anything that touches the DB or auth.

## Commits

Use `pnpm commit` instead of `git commit`. Husky enforces:

- **pre-commit**: Prettier check must pass
- **commit-msg**: commitlint validates conventional commit format (`type(scope): description`)

Scopes are optional. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`.

## Stack

- **Next.js 16** with App Router and React 19
- **Tailwind CSS v4** — no `tailwind.config.js`, configuration lives in `globals.css` via `@theme inline`
- **shadcn** (radix-nova style) — add components with `pnpm dlx shadcn@latest add <component>`
- **TypeScript** strict mode, path alias `@/*` maps to `src/*`
- **PostgreSQL + Prisma 7** — driver adapter (`@prisma/adapter-pg`); the client is generated to `src/generated/prisma` (gitignored)
- **Better Auth** — self-hosted email/password only (no OAuth providers), with the `admin` plugin
- **TanStack Query** — async client state, wired in `src/providers/`

## Architecture

App Router structure under `src/app/`. Server Components by default — add `"use client"` only when needed (event handlers, hooks, browser APIs).

shadcn components go in `src/components/ui/`. Shared logic in `src/lib/`. The `cn()` utility from `src/lib/utils.ts` merges Tailwind classes (clsx + tailwind-merge).

CSS variables for theming are defined in `src/app/globals.css` using `oklch` color space. Dark mode uses the `.dark` class (not `prefers-color-scheme`).

### Data & auth

- **Prisma client** is a global singleton in `src/lib/prisma.ts` (avoids exhausting connections during dev hot-reload). Import it as the default export. Note the generated client lives at `src/generated/prisma/client` and is imported there via a relative path (the `@/` alias is not resolvable by Prisma/Better Auth CLIs).
- **Better Auth** is configured in `src/lib/auth.ts` (server) and consumed in the browser via `src/lib/auth-client.ts`. The HTTP handler is `src/app/api/auth/[...all]/route.ts`. Use Better Auth's own client hooks (`useSession`, etc.) for auth state — keep TanStack Query for application data.
- **Roles:** the `admin` plugin owns `role` (admin/regular) and `banned` (active/inactive). Admins manage accounts (create, ban/unban); all non-admin users share the same permissions, so there is no per-user granular permission model.
- **Domain restriction:** account creation is limited to the institutional domain via `databaseHooks.user.create.before` in `src/lib/auth.ts`, configurable through `ALLOWED_EMAIL_DOMAIN`.
- **Credentials:** passwords are hashed by Better Auth (scrypt) and stored in `account.password` with `providerId: "credential"`. The `user` table never holds a password. Never select or log that column.
- **No public sign-up:** `emailAndPassword.disableSignUp` is on, so `/api/auth/sign-up/email` is closed. The first account comes from `prisma/seed.ts` (`pnpm db:seed`); the rest are created by an admin through the `admin` plugin.
- **Brute force:** `rateLimit` runs in memory (5 attempts/minute on `/sign-in/email`). Deployment is a single container with no replicas, so there's no need to persist it in the database.
- **Session helper:** `getSession()` and `requireUser()` live in `src/lib/session.ts`. `getSession()` is wrapped in React `cache()` so the layout guard and the page share one query per request; `requireUser()` throws a 401 `AppError` and is what API routes use.

### Feature modules

Domain logic lives in `src/features/<entity>/`, not in the route files. `strategic-actions` is the reference implementation; copy its shape for Events, Requests, Deliveries, Activities and Evidence.

- `schemas.ts` — zod schemas (single source of truth for types and error messages, all in Spanish) plus the output DTOs. **Dates cross the wire as ISO strings, never `Date`.**
- `service.ts` — Prisma queries and business rules. Throws `AppError(status, message, { fieldErrors, details })` from `src/lib/api-error.ts`; knows nothing about `Request`/`Response`.
- `api.ts` / `queries.ts` — typed `fetch` wrappers and the TanStack Query hooks, with hierarchical query keys.
- `components/` — the client views.

REST route handlers under `src/app/api/<entity>/` stay thin: authenticate with `requireUser()`, parse with the zod schema, delegate to the service, and `catch` into `toErrorResponse()`. Error bodies are always `{ message, fieldErrors?, details? }`.

Two gotchas worth knowing: dates are stored as UTC midnight, so format them with `formatDate()` from `src/lib/format.ts` (it forces `timeZone: "UTC"`; the local zone shifts them a day back in Chile), and the `radix-nova` registry has no `form` component — use react-hook-form with the `Field` wrapper in `src/features/strategic-actions/components/field.tsx`.

### Route protection

- `src/proxy.ts` (Next 16 renamed `middleware` to `proxy`) does an optimistic check: it only looks for the session cookie and redirects to `/login?redirectTo=…`. It never touches the database.
- `src/app/(app)/layout.tsx` is the real gate: it calls `getSession()` and redirects when the session is missing or revoked. Every authenticated view goes inside the `(app)` route group so it inherits that check plus the shell (sidebar, topbar, toasts).
- The reverse redirect (an authenticated user landing on `/login`) lives in `src/app/login/page.tsx`, not in the proxy: doing it from the cookie alone would loop forever when the cookie is present but the session was revoked server-side.
- Session cookie caching is disabled so a sign-out or a ban takes effect on the very next request.
