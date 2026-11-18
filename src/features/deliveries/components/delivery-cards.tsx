"use client"
import { Popover } from "radix-ui"
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { formatRut } from "@/lib/rut"
import type { Delivery } from "../schemas"
export function DeliveryCards({
  rows,
  onView,
  onEdit,
  onDelete,
}: {
  rows: Delivery[]
  onView: (id: string, trigger: HTMLElement) => void
  onEdit: (item: Delivery) => void
  onDelete: (item: Delivery) => void
}) {
  const [actions, setActions] = useState<string | null>(null)
  useEffect(() => {
    if (!actions) return
    const closeOutside = (event: PointerEvent) => {
      const inside = event
        .composedPath()
        .some((node) => node instanceof Element && node.getAttribute("data-delivery-actions-id") === actions)
      if (!inside) setActions(null)
    }
    document.addEventListener("pointerdown", closeOutside, true)
    return () => document.removeEventListener("pointerdown", closeOutside, true)
  }, [actions])
  return (
    <div className="delivery-mobile-cards">
      {rows.map((d) => (
        <article key={d.id} className="delivery-mobile-card">
          <button
            data-delivery-view={d.id}
            className="delivery-mobile-card-open"
            onClick={(e) => onView(d.id, e.currentTarget)}
          >
            <span className="font-mono text-xs font-semibold">{d.folio}</span>
            <strong>{d.beneficiary}</strong>
            <span className="text-muted-foreground font-mono text-xs">
              {d.beneficiaryRut ? formatRut(d.beneficiaryRut) : "Sin RUT registrado"}
            </span>
            <span className="delivery-mobile-card-bottom">
              <span>
                {formatDate(d.date)}
                <br />
                {d.neighborhoodAssociation
                  ? `N°${d.neighborhoodAssociation.number} · ${d.neighborhoodAssociation.name}`
                  : "Sin junta vecinal"}
              </span>
              <span className="delivery-badge">
                {d.items.length} {d.items.length === 1 ? "insumo" : "insumos"}
              </span>
            </span>
            {d.event && (
              <span className="delivery-mobile-event">
                <span className="delivery-badge delivery-badge-event">{d.event.folio}</span>
              </span>
            )}
          </button>
          <Popover.Root open={actions === d.id} onOpenChange={(open) => setActions(open ? d.id : null)}>
            <Popover.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-delivery-actions-id={d.id}
                className="delivery-mobile-card-menu"
                aria-label={`Acciones de ${d.folio}`}
              >
                <MoreHorizontal size={20} />
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                data-delivery-actions-id={d.id}
                onInteractOutside={() => setActions(null)}
                align="end"
                sideOffset={6}
                collisionPadding={12}
                className="delivery-mobile-actions bg-popover z-50 min-w-44 rounded-xl border p-1 shadow-lg"
                aria-label={`Acciones de ${d.folio}`}
              >
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    setActions(null)
                    const card = document.querySelector<HTMLElement>(`[data-delivery-view="${d.id}"]`)
                    onView(d.id, card ?? e.currentTarget)
                  }}
                >
                  <Eye size={16} /> Ver detalle
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setActions(null)
                    onEdit(d)
                  }}
                >
                  <Pencil size={16} /> Editar
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    setActions(null)
                    onDelete(d)
                  }}
                >
                  <Trash2 size={16} /> Eliminar
                </Button>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </article>
      ))}
    </div>
  )
}
