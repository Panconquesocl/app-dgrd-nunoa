import type { Crumb } from "@/components/layout/app-topbar"
import type { Delivery } from "./schemas"

export function deliveryBreadcrumbs(
  delivery: Pick<Delivery, "folio" | "event" | "request"> | undefined,
  access: { events: boolean; requests: boolean },
): Crumb[] {
  const current: Crumb = { label: delivery?.folio ?? "Entrega", current: true }
  if (delivery?.event && access.events)
    return [
      { label: "Emergencias" },
      { label: "Eventos", href: "/eventos" },
      { label: delivery.event.folio, href: `/eventos/${delivery.event.id}` },
      current,
    ]
  if (delivery?.request && access.requests)
    return [
      { label: "Emergencias" },
      { label: "Solicitudes", href: "/solicitudes" },
      { label: delivery.request.folio, href: `/solicitudes/${delivery.request.id}` },
      current,
    ]
  return [{ label: "Ayudas primera respuesta" }, { label: "Entregas", href: "/entregas" }, current]
}
