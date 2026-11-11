import Link from "next/link"
import { Box, Truck, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export function AidTabs({ active }: { active: "deliveries" | "supplies" | "neighborhood-associations" }) {
  return (
    <nav aria-label="Ayudas primera respuesta" className="mb-6 flex flex-wrap items-center gap-2">
      {[
        { key: "deliveries", href: "/entregas", label: "Entregas", icon: Truck },
        { key: "supplies", href: "/insumos", label: "Insumos", icon: Box },
        { key: "neighborhood-associations", href: "/juntas-vecinales", label: "Juntas vecinales", icon: Users },
      ].map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium",
            active === key ? "bg-surface border font-semibold shadow-xs" : "text-muted-foreground hover:bg-surface/60",
          )}
        >
          <Icon size={15} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
