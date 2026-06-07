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

## Architecture

App Router structure under `src/app/`. Server Components by default — add `"use client"` only when needed (event handlers, hooks, browser APIs).

shadcn components go in `src/components/ui/`. Shared logic in `src/lib/`. The `cn()` utility from `src/lib/utils.ts` merges Tailwind classes (clsx + tailwind-merge).

CSS variables for theming are defined in `src/app/globals.css` using `oklch` color space. Dark mode uses the `.dark` class (not `prefers-color-scheme`).
