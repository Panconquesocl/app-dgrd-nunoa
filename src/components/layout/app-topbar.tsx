import { ChevronRight } from "lucide-react"
import { GlobalSearch } from "@/features/search/components/global-search"

export type Crumb = { label: string; current?: boolean }

/**
 * Barra superior de las vistas autenticadas: ruta actual a la izquierda e
 * identidad a la derecha.
 */
export function AppTopbar({
  crumbs,
  user,
}: {
  crumbs: Crumb[]
  user?: { name: string; email: string; lastName?: string | null } | null
}) {
  const fullName = user ? [user.name, user.lastName].filter(Boolean).join(" ") : ""
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <header className="bg-surface flex h-14 shrink-0 items-center justify-between gap-4 border-b px-5 sm:px-7">
      <nav aria-label="Ruta actual" className="min-w-0 overflow-x-auto">
        <ol className="flex items-center gap-1.5 text-[13px] whitespace-nowrap">
          {crumbs.map((crumb, index) => (
            <li key={crumb.label} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight aria-hidden="true" className="text-muted-foreground size-3.5" />}
              <span
                aria-current={crumb.current ? "page" : undefined}
                className={crumb.current ? "font-semibold" : "text-muted-foreground"}
              >
                {crumb.label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {user && (
        <div className="flex shrink-0 items-center gap-2.5">
          <GlobalSearch viewerKey={user.email} />
          <span className="bg-ink flex size-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold text-white">
            {initials}
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-[12.5px] font-semibold">{fullName}</span>
            <span className="text-muted-foreground block text-[11.5px]">{user.email}</span>
          </span>
        </div>
      )}
    </header>
  )
}
