"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CalendarDays, FileText, Truck } from "lucide-react"
import { usePermission } from "@/providers/permissions"
import { cn } from "@/lib/utils"

export function AppMobileNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const canReadDeliveries = usePermission("deliveries", "read")
  const canReadActivities = usePermission("activities", "read")
  const canReadRequests = usePermission("requests", "read")

  useEffect(() => {
    // El destino móvil se decide por el espacio disponible, sin clasificar el dispositivo.
    const media = window.matchMedia("(max-width: 1023px)")
    const redirectSummary = () => {
      if (media.matches && pathname === "/resumen") router.replace("/plan/cronograma")
    }
    redirectSummary()
    media.addEventListener("change", redirectSummary)
    return () => media.removeEventListener("change", redirectSummary)
  }, [pathname, router])

  const items = [
    { href: "/entregas", label: "Entregas", icon: Truck, active: pathname.startsWith("/entregas") },
    ...(canReadRequests
      ? [{ href: "/solicitudes", label: "Solicitudes", icon: FileText, active: pathname.startsWith("/solicitudes") }]
      : []),
    {
      href: "/plan/cronograma",
      label: "Actividades",
      icon: CalendarDays,
      active: pathname.startsWith("/plan/"),
    },
  ]

  return (
    <nav className="app-mobile-navigation" aria-label="Navegación principal móvil">
      {items
        .filter((item) =>
          item.href === "/entregas" ? canReadDeliveries : item.href === "/plan/cronograma" ? canReadActivities : true,
        )
        .map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("app-mobile-link", active && "app-mobile-link-active")}
          >
            <Icon size={23} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
    </nav>
  )
}
