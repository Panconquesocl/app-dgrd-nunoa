"use client"
import { useRef, useState } from "react"
import { ChevronDown, Eye, Pencil, Plus, Search, Siren, Trash2 } from "lucide-react"
import { SpikeFilterIcon } from "@/components/layout/spike-filter-icon"
import "@/components/layout/filter-controls.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePermission } from "@/providers/permissions"
import { formatDate } from "@/lib/format"
import { useEventTypes } from "@/features/event-types/queries"
import { useEvents } from "../queries"
import type { EventItem } from "../schemas"
import { EventTypeBadge } from "./event-type-badge"
import { EventFormDialog } from "./event-form-dialog"
import { EventDetailView } from "./event-detail-view"
import { DeleteEventDialog } from "./delete-event-dialog"
import "@/features/deliveries/components/deliveries.css"
import "@/features/requests/components/requests.css"
import "./events.css"
export function EventsView() {
  const query = useEvents()
  const types = useEventTypes()
  const [search, setSearch] = useState("")
  const [type, setType] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [form, setForm] = useState<{ event?: EventItem } | null>(null)
  const [deleting, setDeleting] = useState<EventItem | null>(null)
  const [selected, setSelected] = useState<EventItem | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const canCreate = usePermission("events", "create")
  const canUpdate = usePermission("events", "update")
  const canDelete = usePermission("events", "delete")
  const rows = (query.data?.data ?? []).filter(
    (event) =>
      (!type || event.typeId === type) &&
      (!from || event.date.slice(0, 10) >= from) &&
      (!to || event.date.slice(0, 10) <= to) &&
      `${event.folio} ${event.type.name} ${event.sector}`
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  )
  const filtered = Boolean(search || type || from || to)
  function open(event: EventItem, target: HTMLElement) {
    opener.current = target
    setSelected(event)
  }
  return (
    <div className="requests deliveries delivery-page">
      <div className="delivery-page-head">
        <div>
          <span className="requests-eyebrow">Emergencias</span>
          <h1>Eventos</h1>
          <p>Eventos de emergencia documentados, con sus entregas y solicitudes asociadas.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setForm({})}>
            <Plus size={16} />
            Nuevo evento
          </Button>
        )}
      </div>
      <div className="spike-toolbar">
        <div className="requests-search">
          <Search size={16} aria-hidden="true" />
          <Input
            placeholder="Buscar por folio, tipo o sector…"
            aria-label="Buscar eventos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="spike-filter-select">
          <SpikeFilterIcon size={15} />
          <select aria-label="Filtrar por tipo" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {types.data?.data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
        <label className="spike-filter-select">
          <span>Desde</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="spike-filter-select">
          <span>Hasta</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        {filtered && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("")
              setType("")
              setFrom("")
              setTo("")
            }}
          >
            Limpiar
          </Button>
        )}
      </div>
      <div className="delivery-panel" aria-busy={query.isFetching}>
        {query.isPending ? (
          <div className="space-y-3 p-5" role="status" aria-label="Cargando eventos">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="delivery-empty" role="alert">
            <h2>No se pudieron cargar los eventos</h2>
            <p>{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : !rows.length ? (
          <div className="delivery-empty">
            <Siren size={28} />
            <h2>No hay eventos</h2>
            <p>
              {filtered
                ? "No se encontraron eventos con los filtros aplicados."
                : "Aún no se han registrado eventos de emergencia."}
            </p>
            {canCreate && (
              <Button onClick={() => setForm({})}>
                <Plus size={16} />
                Nuevo evento
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="delivery-table events-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Sector</th>
                  <th>Afectados</th>
                  <th>Solicitudes</th>
                  <th>Entregas</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((event) => (
                  <tr
                    key={event.id}
                    onClick={(e) => {
                      const target = e.currentTarget.querySelector<HTMLButtonElement>("button")
                      if (target) open(event, target)
                    }}
                  >
                    <td>
                      <button
                        className="requests-folio"
                        onClick={(e) => {
                          e.stopPropagation()
                          open(event, e.currentTarget)
                        }}
                      >
                        {event.folio}
                      </button>
                    </td>
                    <td>
                      <EventTypeBadge name={event.type.name} />
                    </td>
                    <td className="font-mono text-xs whitespace-nowrap">{formatDate(event.date)}</td>
                    <td>
                      <span className="requests-clamp">{event.sector}</span>
                    </td>
                    <td>{event.affectedCount ?? "—"}</td>
                    <td>
                      <span className="delivery-count">{event._count.requests}</span>
                    </td>
                    <td>
                      <span className="delivery-count">{event._count.deliveries}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="requests-row-actions">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Ver evento ${event.folio}`}
                          onClick={(e) => open(event, e.currentTarget)}
                        >
                          <Eye size={16} />
                        </Button>
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar evento ${event.folio}`}
                            onClick={() => setForm({ event })}
                          >
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label={`Eliminar evento ${event.folio}`}
                            onClick={() => setDeleting(event)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {form && <EventFormDialog event={form.event} onClose={() => setForm(null)} />}
      {deleting && <DeleteEventDialog event={deleting} onClose={() => setDeleting(null)} />}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent
          placement="right"
          className="requests-drawer"
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            opener.current?.focus()
          }}
        >
          <DialogHeader className="requests-drawer-header">
            <DialogDescription className="font-mono">{selected?.folio}</DialogDescription>
            <DialogTitle>Evento</DialogTitle>
          </DialogHeader>
          <div className="requests-drawer-body">
            {selected && <EventDetailView id={selected.id} embedded onClose={() => setSelected(null)} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
