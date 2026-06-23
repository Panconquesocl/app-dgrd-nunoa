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
- **Better Auth** — email/password + Google OAuth, with the `admin` plugin
- **TanStack Query** — async client state, wired in `src/providers/`

## Architecture

App Router structure under `src/app/`. Server Components by default — add `"use client"` only when needed (event handlers, hooks, browser APIs).

shadcn components go in `src/components/ui/`. Shared logic in `src/lib/`. The `cn()` utility from `src/lib/utils.ts` merges Tailwind classes (clsx + tailwind-merge).

CSS variables for theming are defined in `src/app/globals.css` using `oklch` color space. Dark mode uses the `.dark` class (not `prefers-color-scheme`).

### Data & auth

- **Prisma client** is a global singleton in `src/lib/prisma.ts` (avoids exhausting connections during dev hot-reload). Import it as the default export. Note the generated client lives at `src/generated/prisma/client` and is imported there via a relative path (the `@/` alias is not resolvable by Prisma/Better Auth CLIs).
- **Better Auth** is configured in `src/lib/auth.ts` (server) and consumed in the browser via `src/lib/auth-client.ts`. The HTTP handler is `src/app/api/auth/[...all]/route.ts`. Use Better Auth's own client hooks (`useSession`, etc.) for auth state — keep TanStack Query for application data.
- **Roles:** the `admin` plugin owns `role` (admin/regular) and `banned` (active/inactive). Admins manage accounts (create, ban/unban); all non-admin users share the same permissions, so there is no per-user granular permission model.
- **Domain restriction:** sign-up (password and OAuth) is limited to the institutional domain via `databaseHooks.user.create.before` in `src/lib/auth.ts`, configurable through `ALLOWED_EMAIL_DOMAIN`.
