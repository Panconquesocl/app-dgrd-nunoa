import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"

type AppHeaderProps = {
  name: string
  email: string
}

/** Barra superior presente en todas las vistas autenticadas. */
export function AppHeader({ name, email }: AppHeaderProps) {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="focus-visible:ring-brand/60 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <Image
            src="/logo-full-white.svg"
            alt="DGRD Ñuñoa · Inicio"
            width={84}
            height={36}
            unoptimized
            priority
            className="h-9 w-auto"
          />
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-[12.5px] font-semibold">{name}</span>
            <span className="text-ink-muted block text-[11.5px]">{email}</span>
          </span>
          <span className="bg-sidebar-border hidden h-6 w-px sm:block" />
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
