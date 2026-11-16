"use client"

import { usePermission } from "@/providers/permissions"
import { useState, useSyncExternalStore } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Box,
  CalendarRange,
  ChevronRight,
  ChevronsLeft,
  FileText,
  Home,
  History,
  Package,
  Settings,
  Siren,
  Target,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavigationCounts } from "@/features/summary/queries"
import type { NavigationCounts } from "@/features/summary/schemas"
import "./app-sidebar.css"

const COLLAPSED_KEY = "dgrd_sidebar_collapsed"
function subscribeSidebar(callback: () => void) {
  const media = window.matchMedia("(max-width: 1023px)")
  window.addEventListener("storage", callback)
  window.addEventListener("sidebar-preference", callback)
  media.addEventListener("change", callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener("sidebar-preference", callback)
    media.removeEventListener("change", callback)
  }
}
function getCollapsed() {
  try {
    const value = localStorage.getItem(COLLAPSED_KEY)
    if (value !== null) return value === "1"
  } catch {}
  return window.matchMedia("(max-width: 1023px)").matches
}
const serverCollapsed = () => false

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  countKey?: keyof NavigationCounts
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
      { href: "/solicitudes", label: "Solicitudes", icon: FileText, countKey: "requests" },
      { href: "/eventos", label: "Eventos", icon: Siren, countKey: "events" },
    ],
  },
  {
    label: "Ayudas primera respuesta",
    items: [
      { href: "/entregas", label: "Entregas", icon: Package, countKey: "deliveries" },
      { href: "/insumos", label: "Insumos", icon: Box },
      { href: "/juntas-vecinales", label: "Juntas vecinales", icon: Users },
    ],
  },
  {
    label: "Plan RRD",
    items: [
      { href: "/plan/acciones", label: "Acciones estratégicas", icon: Target },
      { href: "/plan/cronograma", label: "Cronograma", icon: CalendarRange },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
      { href: "/admin/configuracion", label: "Configuración", icon: Settings },
      { href: "/admin/auditoria", label: "Auditoría", icon: History },
    ],
  },
]

export function AppSidebar({ viewerKey }: { viewerKey: string }) {
  const pathname = usePathname()
  const counts = useNavigationCounts(viewerKey)
  const collapsed = useSyncExternalStore(subscribeSidebar, getCollapsed, serverCollapsed)
  const [fallbackCollapsed, setFallbackCollapsed] = useState<boolean | null>(null)
  const isCollapsed = fallbackCollapsed ?? collapsed
  function toggleSidebar() {
    setFallbackCollapsed(!isCollapsed)
    try {
      localStorage.setItem(COLLAPSED_KEY, isCollapsed ? "0" : "1")
      window.dispatchEvent(new Event("sidebar-preference"))
    } catch {}
  }
  const canConfigure = usePermission("event-types", "read")
  const canReadEmergencies = usePermission("requests", "read")

  return (
    <aside className="app-sidebar bg-ink text-white" data-collapsed={isCollapsed}>
      <Link
        href="/plan/acciones"
        aria-label="Dirección de Gestión del Riesgo de Desastres · Municipalidad de Ñuñoa"
        className="app-sidebar-brand focus-visible:ring-brand/60 flex items-center gap-3 px-5 py-5 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
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
        <span className="app-sidebar-brand-text leading-[1.25]">
          <span className="block text-[13px] font-semibold">Dirección de Gestión del Riesgo de Desastres</span>
          <span className="text-ink-muted block text-[11px]">Municipalidad de Ñuñoa</span>
        </span>
      </Link>

      <nav
        id="app-sidebar-navigation"
        aria-label="Navegación principal"
        className="app-sidebar-nav flex flex-1 flex-col gap-6 px-3 py-4"
      >
        {NAV_GROUPS.filter(
          (group) =>
            (group.label !== "Emergencias" || canReadEmergencies) && (group.label !== "Administración" || canConfigure),
        ).map((group) => (
          <div key={group.label} className="app-sidebar-group">
            <p className="app-sidebar-group-label text-ink-muted px-2 pb-2 text-[10px] font-semibold tracking-[0.09em] uppercase">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon, countKey }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`)
                const count = countKey && !counts.isError ? counts.data?.[countKey] : undefined

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      title={isCollapsed ? label : undefined}
                      aria-label={count !== undefined ? `${label}: ${count}` : label}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "app-sidebar-link focus-visible:ring-brand/60 relative flex items-center gap-2.5 rounded-md px-2 py-2 text-[13.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
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
                      <span className="app-sidebar-label">{label}</span>
                      {countKey && (
                        <span className="app-sidebar-count" aria-hidden="true">
                          {count !== undefined ? count.toLocaleString("es-CL") : "—"}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="app-sidebar-footer">
        <button
          type="button"
          className="app-sidebar-toggle"
          onClick={toggleSidebar}
          aria-controls="app-sidebar-navigation"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
          title={isCollapsed ? "Expandir" : "Contraer"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronsLeft size={18} />}
          <span>Contraer menú</span>
        </button>
      </div>
    </aside>
  )
}
