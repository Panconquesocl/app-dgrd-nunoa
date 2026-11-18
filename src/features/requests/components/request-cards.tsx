"use client"
import { useEffect, useRef, useState } from "react"
import { Popover } from "radix-ui"
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePermission } from "@/providers/permissions"
import type { RequestListItem } from "../schemas"
import { RequestStatusBadge } from "./request-status-badge"
const date = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  year: "numeric",
})
export function RequestCards({
  rows,
  onView,
  onEdit,
  onDelete,
}: {
  rows: RequestListItem[]
  onView: (row: RequestListItem, target: HTMLElement) => void
  onEdit: (row: RequestListItem) => void
  onDelete: (row: RequestListItem) => void
}) {
  const [actions, setActions] = useState<string | null>(null)
  const openers = useRef(new Map<string, HTMLButtonElement>())
  const canEdit = usePermission("requests", "update"),
    canDelete = usePermission("requests", "delete")
  useEffect(() => {
    if (!actions) return
    const outside = (event: PointerEvent) => {
      if (
        !event
          .composedPath()
          .some((node) => node instanceof Element && node.getAttribute("data-request-actions-id") === actions)
      )
        setActions(null)
    }
    document.addEventListener("pointerdown", outside, true)
    return () => document.removeEventListener("pointerdown", outside, true)
  }, [actions])
  return (
    <div className="request-mobile-cards">
      {rows.map((row) => (
        <article className="request-mobile-card" key={row.id}>
          <button
            ref={(node) => {
              if (node) openers.current.set(row.id, node)
              else openers.current.delete(row.id)
            }}
            className="request-mobile-open"
            onClick={(event) => onView(row, event.currentTarget)}
          >
            <span className="request-mobile-folio font-mono text-xs font-semibold">{row.folio}</span>
            <strong className="request-mobile-description">{row.description || "Sin descripción registrada"}</strong>
            <span className="request-mobile-channel">{row.channel}</span>
            <span className="request-mobile-bottom">
              <span>{date.format(new Date(row.createdAt))}</span>
              <RequestStatusBadge status={row.status} />
            </span>
            {row.event && (
              <span className="request-mobile-event requests-event requests-event-linked">{row.event.folio}</span>
            )}
          </button>
          <Popover.Root open={actions === row.id} onOpenChange={(open) => setActions(open ? row.id : null)}>
            <Popover.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="request-mobile-menu"
                data-request-actions-id={row.id}
                aria-label={`Acciones de ${row.folio}`}
              >
                <MoreHorizontal size={20} />
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={6}
                collisionPadding={12}
                data-request-actions-id={row.id}
                onInteractOutside={() => setActions(null)}
                className="request-mobile-actions bg-popover z-50 min-w-44 rounded-xl border p-1 shadow-lg"
                aria-label={`Acciones de ${row.folio}`}
              >
                <Button
                  variant="ghost"
                  onClick={(event) => {
                    setActions(null)
                    onView(row, openers.current.get(row.id) ?? event.currentTarget)
                  }}
                >
                  <Eye size={16} />
                  Ver detalle
                </Button>
                {canEdit && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActions(null)
                      onEdit(row)
                    }}
                  >
                    <Pencil size={16} />
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      setActions(null)
                      onDelete(row)
                    }}
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </Button>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </article>
      ))}
    </div>
  )
}
