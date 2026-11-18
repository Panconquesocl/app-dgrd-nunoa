"use client"

import { Popover } from "radix-ui"
import { ChevronDown } from "lucide-react"
import type { TopbarUser } from "@/components/layout/app-topbar"
import { SignOutButton } from "./sign-out-button"

export function UserMenu({ user }: { user: NonNullable<TopbarUser> }) {
  const fullName = [user.name, user.lastName].filter(Boolean).join(" ")
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Menú de usuario: ${fullName}`}
          className="hover:bg-muted focus-visible:ring-ring ml-auto flex h-10 w-fit max-w-full min-w-0 items-center justify-end gap-2 rounded-lg px-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="bg-ink flex size-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold text-white"
          >
            {initials}
          </span>
          <span className="hidden min-w-0 text-left leading-tight sm:block">
            <span className="block truncate text-[12.5px] font-semibold" title={fullName}>
              {fullName}
            </span>
            <span className="text-muted-foreground block truncate text-[11.5px]" title={user.email}>
              {user.email}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="Cuenta de usuario"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="app-user-popover bg-popover text-popover-foreground z-50 w-72 max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border shadow-lg"
        >
          <div className="app-user-identity border-b px-4 py-3">
            <p className="text-sm font-semibold break-words">{fullName}</p>
            <p className="text-muted-foreground mt-1 text-xs break-all">{user.email}</p>
          </div>
          <div className="p-1">
            <SignOutButton />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
