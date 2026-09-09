"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarRange, FileText, Home, Package, Siren } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  { label: "General", items: [{ href: "/resumen", label: "Resumen", icon: Home }] },
  {
    label: "Emergencias",
    items: [
      { href: "/solicitudes", label: "Solicitudes", icon: FileText },
      { href: "/eventos", label: "Eventos", icon: Siren },
    ],
  },
  {
    label: "Ayudas primera respuesta",
    items: [{ href: "/entregas", label: "Entregas", icon: Package }],
  },
  {
    label: "Plan RRD",
    items: [{ href: "/plan/acciones", label: "Cronograma", icon: CalendarRange }],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="bg-ink hidden w-[248px] shrink-0 flex-col text-white lg:flex">
      <Link
        href="/plan/acciones"
        className="focus-visible:ring-brand/60 flex items-center gap-3 px-5 py-5 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      >
        <Image
          src="/logo-mark-yellow.svg"
          alt=""
          width={34}
          height={34}
          unoptimized
          aria-hidden="true"
          className="size-[34px] shrink-0"
        />
        <span className="leading-[1.25]">
          <span className="block text-[13px] font-semibold">Dirección de Gestión de Riesgo y Desastres</span>
          <span className="text-ink-muted block text-[11px]">Municipalidad de Ñuñoa</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-6 px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-ink-muted px-2 pb-2 text-[10px] font-semibold tracking-[0.09em] uppercase">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`)

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "focus-visible:ring-brand/60 relative flex items-center gap-2.5 rounded-md px-2 py-2 text-[13.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                        isActive ? "bg-ink-soft text-white" : "text-ink-muted hover:bg-ink-soft/60 hover:text-white",
                      )}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="bg-brand absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                        />
                      )}
                      <Icon className={cn("size-4 shrink-0", isActive && "text-brand")} />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
