import { ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { GlobalSearch } from "@/features/search/components/global-search"
import { UserMenu } from "@/components/auth/user-menu"

export type Crumb = { label: string; href?: string; current?: boolean }
export type TopbarUser = { name: string; email: string; lastName?: string | null } | null

/**
 * Barra superior fija al desplazar: ruta a la izquierda, búsqueda centrada e
 * identidad a la derecha.
 */
export function AppTopbar({ crumbs, user }: { crumbs: Crumb[]; user?: TopbarUser }) {
  return (
    <header
      data-mobile-hide-crumbs={crumbs.some((crumb) => /^(ENT-|SOL-)/.test(crumb.label) || crumb.label === "Actividad")}
      className="app-topbar bg-surface sticky top-0 z-30 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b px-5 sm:gap-4 sm:px-7"
    >
      <Link href="/plan/actividades" className="app-mobile-brand" aria-label="Municipalidad de Ñuñoa · Actividades">
        <Image src="/logo-mark-yellow.svg" alt="" width={34} height={34} unoptimized />
      </Link>
      {crumbs.length > 0 && (
        <nav aria-label="Ruta actual" className="app-topbar-crumbs col-start-1 row-start-1 min-w-0 overflow-x-auto">
          <ol className="flex items-center gap-1.5 text-[13px] whitespace-nowrap">
            {crumbs.map((crumb, index) => (
              <li key={`${index}:${crumb.label}`} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight aria-hidden="true" className="text-muted-foreground size-3.5" />}
                {crumb.href && index < crumbs.length - 1 && !crumb.current ? (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={index === crumbs.length - 1 ? "page" : undefined}
                    className={index === crumbs.length - 1 ? "font-semibold" : "text-muted-foreground"}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {user && (
        <>
          <div className="col-start-2 row-start-1">
            <GlobalSearch viewerKey={user.email} />
          </div>
          <div className="app-topbar-user col-start-3 row-start-1 min-w-0">
            <UserMenu user={user} />
          </div>
        </>
      )}
    </header>
  )
}
