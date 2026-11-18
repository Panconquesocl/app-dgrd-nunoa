"use client"
import { Fragment, useRef, useState, useSyncExternalStore } from "react"
import { Popover } from "radix-ui"
import { Check, Eye, FileText, Pencil, Plus, Rows3, Search, Table2, Trash2 } from "lucide-react"
import { SpikeFilterIcon } from "@/components/layout/spike-filter-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePermission } from "@/providers/permissions"
import { useRequests } from "../queries"
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, type RequestListItem, type RequestStatus } from "../schemas"
import { RequestFormDialog } from "./request-form-dialog"
import { DeleteRequestDialog } from "./delete-request-dialog"
import { RequestStatusBadge } from "./request-status-badge"
import { RequestDetailView } from "./request-detail-view"
import "@/features/deliveries/components/deliveries.css"
import { RequestCards } from "./request-cards"
import { RequestMobileFilters, type RequestMobileFilterValues } from "./request-mobile-filters"
import "./requests.css"
import "./request-mobile.css"

const VIEW_KEY = "dgrd_sol_vista"
function subscribeView(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener("request-view", callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener("request-view", callback)
  }
}
function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "compacta"
  } catch {
    return false
  }
}
const serverView = () => false
const createdDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const displayDate = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function RequestsView() {
  const [mobileFilters, setMobileFilters] = useState(false)
  const [search, setSearch] = useState("")
  const [event, setEvent] = useState<"all" | "with" | "without">("all")
  const [status, setStatus] = useState<RequestStatus | "">("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [order, setOrder] = useState("desc")
  const compact = useSyncExternalStore(subscribeView, readView, serverView)
  const [temporaryView, setTemporaryView] = useState<boolean | null>(null)
  const isCompact = temporaryView ?? compact
  function setView(value: boolean) {
    setTemporaryView(value)
    try {
      localStorage.setItem(VIEW_KEY, value ? "compacta" : "detallada")
      window.dispatchEvent(new Event("request-view"))
    } catch {
      /* La vista funciona también sin almacenamiento. */
    }
  }
  const [form, setForm] = useState<{ request?: RequestListItem } | null>(null)
  const [deleting, setDeleting] = useState<RequestListItem | null>(null)
  const [selected, setSelected] = useState<RequestListItem | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const canCreate = usePermission("requests", "create")
  const canUpdate = usePermission("requests", "update")
  const canDelete = usePermission("requests", "delete")
  // El endpoint devuelve el listado completo; filtros y contadores comparten la misma instantánea.
  const query = useRequests()
  const data = query.data?.data ?? []
  const rows = data
    .filter((request) => {
      const day = createdDate.format(new Date(request.createdAt))
      return (
        (!status || request.status === status) &&
        (event === "all" || (event === "with" ? Boolean(request.eventId) : !request.eventId)) &&
        (!from || day >= from) &&
        (!to || day <= to) &&
        [request.folio, request.channel, request.description, request.response]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(search.trim().toLocaleLowerCase("es"))
      )
    })
    .sort((a, b) => (a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) * (order === "asc" ? 1 : -1))
  const advancedCount =
    Number(event !== "all") +
    Number(status === "attended" || status === "cancelled") +
    Number(Boolean(from || to)) +
    Number(order !== "desc")
  const hasFilters = Boolean(search || event !== "all" || status || from || to || order !== "desc")
  function applyMobileFilters(value: RequestMobileFilterValues) {
    setEvent(value.event)
    setStatus(value.status)
    setFrom(value.from)
    setTo(value.to)
    setOrder(value.order)
    setMobileFilters(false)
  }
  const mobileCount =
    Number(Boolean(status)) + Number(event !== "all") + Number(Boolean(from || to)) + Number(order !== "desc")
  function clear() {
    setSearch("")
    setEvent("all")
    setStatus("")
    setFrom("")
    setTo("")
    setOrder("desc")
  }
  function openDetail(request: RequestListItem, target: HTMLElement) {
    opener.current = target
    setSelected(request)
  }
  return (
    <div className="requests deliveries delivery-page request-list-view">
      <div className="delivery-page-head">
        <div>
          <span className="requests-eyebrow">Emergencias</span>
          <h1>Solicitudes</h1>
          <p>Registro y seguimiento de solicitudes recibidas por distintos medios.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setForm({})}>
            <Plus size={16} />
            Nueva solicitud
          </Button>
        )}
      </div>
      {canCreate && (
        <Button className="request-register-fab" aria-label="Nueva solicitud" onClick={() => setForm({})}>
          <Plus size={28} aria-hidden="true" />
        </Button>
      )}
      <div className="requests-toolbar">
        <Button className="request-mobile-filter-trigger" variant="outline" onClick={() => setMobileFilters(true)}>
          <SpikeFilterIcon />
          Filtros{mobileCount > 0 && <span>{mobileCount}</span>}
        </Button>
        <div className="requests-segment" aria-label="Estado de solicitudes">
          <button aria-pressed={!status} onClick={() => setStatus("")}>
            Todas <span>{query.isPending ? "—" : data.length}</span>
          </button>
          <button aria-pressed={status === "pending"} onClick={() => setStatus("pending")}>
            Pendientes <span>{query.isPending ? "—" : data.filter((row) => row.status === "pending").length}</span>
          </button>
        </div>
        <div className="requests-toolbar-spacer" />
        <div className="requests-segment" aria-label="Vista de solicitudes">
          <button aria-pressed={!isCompact} onClick={() => setView(false)}>
            <Table2 size={14} />
            Detallada
          </button>
          <button aria-pressed={isCompact} onClick={() => setView(true)}>
            <Rows3 size={14} />
            Compacta
          </button>
        </div>
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="requests-filter-trigger"
              aria-label={`Filtros avanzados${advancedCount ? ` (${advancedCount} activos)` : ""}`}
            >
              <SpikeFilterIcon />
              {advancedCount > 0 && <span>{advancedCount}</span>}
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="requests-filter-menu" align="end" sideOffset={8} collisionPadding={16}>
              <h2>Filtros avanzados</h2>
              <div className="requests-filter-options" role="group" aria-labelledby="request-filter-status">
                <h3 id="request-filter-status">Estado</h3>
                {(["", ...REQUEST_STATUSES] as const).map((value) => (
                  <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>
                    <span>{value ? REQUEST_STATUS_LABELS[value] : "Todas"}</span>
                    {status === value && <Check size={15} />}
                  </button>
                ))}
              </div>
              <div className="requests-filter-options" role="group" aria-labelledby="request-filter-event">
                <h3 id="request-filter-event">Evento asociado</h3>
                {(
                  [
                    ["all", "Todas"],
                    ["with", "Con evento"],
                    ["without", "Sin evento"],
                  ] as const
                ).map(([value, label]) => (
                  <button key={value} aria-pressed={event === value} onClick={() => setEvent(value)}>
                    <span>{label}</span>
                    {event === value && <Check size={15} />}
                  </button>
                ))}
              </div>
              <div className="requests-filter-dates">
                <label>
                  Desde
                  <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label>
                  Hasta
                  <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                </label>
              </div>
              <div className="requests-filter-options" role="group" aria-labelledby="request-filter-order">
                <h3 id="request-filter-order">Ordenar por fecha</h3>
                {(
                  [
                    ["desc", "Más recientes primero"],
                    ["asc", "Más antiguas primero"],
                  ] as const
                ).map(([value, label]) => (
                  <button key={value} aria-pressed={order === value} onClick={() => setOrder(value)}>
                    <span>{label}</span>
                    {order === value && <Check size={15} />}
                  </button>
                ))}
              </div>
              <button className="requests-clear" disabled={!hasFilters} onClick={clear}>
                Limpiar filtros
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <div className="requests-search">
          <Search size={16} aria-hidden="true" />
          <Input
            placeholder="Buscar por folio, medio o respuesta…"
            aria-label="Buscar por folio, medio, descripción o respuesta"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {hasFilters && (
        <div className="requests-filter-summary">
          <span>
            {REQUEST_STATUS_LABELS[status as RequestStatus] ?? "Todos los estados"}
            {event !== "all" && ` · ${event === "with" ? "Con evento" : "Sin evento"}`}
            {from && ` · Desde ${from}`}
            {to && ` · Hasta ${to}`}
            {order === "asc" && " · Más antiguas primero"}
          </span>
          <button onClick={clear}>Limpiar filtros</button>
        </div>
      )}
      <div className="delivery-panel" aria-busy={query.isFetching}>
        {query.isError ? (
          <div className="delivery-empty" role="alert">
            <h2>No se pudieron cargar las solicitudes</h2>
            <p>{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : query.isPending ? (
          <div className="space-y-3 p-5" role="status" aria-label="Cargando solicitudes">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="delivery-empty">
            <FileText size={28} />
            <h2>No hay solicitudes</h2>
            <p>
              {hasFilters
                ? "No se encontraron solicitudes con los filtros aplicados."
                : "Aún no se han registrado solicitudes de emergencia."}
            </p>
            {canCreate && (
              <Button onClick={() => setForm({})}>
                <Plus size={16} />
                Nueva solicitud
              </Button>
            )}
          </div>
        ) : (
          <Fragment>
            <RequestCards
              rows={rows}
              onView={openDetail}
              onEdit={(request) => setForm({ request })}
              onDelete={setDeleting}
            />
            <div className="requests-table-scroll">
              <table className={`delivery-table requests-table ${isCompact ? "requests-table-compact" : ""}`}>
                <thead>
                  <tr>
                    <th>Folio</th>
                    {!isCompact && <th>Medio / fuente</th>}
                    <th>Lo solicitado</th>
                    {!isCompact && <th>Respuesta</th>}
                    <th>Estado</th>
                    {!isCompact && (
                      <>
                        <th>Evento</th>
                        <th>Creada</th>
                      </>
                    )}
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((request) => (
                    <tr
                      key={request.id}
                      onClick={(e) => {
                        const button = e.currentTarget.querySelector<HTMLButtonElement>("button")
                        if (button) openDetail(request, button)
                      }}
                    >
                      <td>
                        <button
                          className="requests-folio"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetail(request, e.currentTarget)
                          }}
                        >
                          {request.folio}
                        </button>
                      </td>
                      {!isCompact && (
                        <td className="font-semibold">
                          <span className="requests-clamp">{request.channel}</span>
                        </td>
                      )}
                      <td className={isCompact ? "font-semibold" : "text-muted-foreground"}>
                        <span className="requests-clamp">{request.description || "—"}</span>
                      </td>
                      {!isCompact && (
                        <td className="text-muted-foreground">
                          <span className="requests-clamp">{request.response || "—"}</span>
                        </td>
                      )}
                      <td>
                        <RequestStatusBadge status={request.status} />
                      </td>
                      {!isCompact && (
                        <>
                          <td>
                            <span className={`requests-event ${request.event ? "requests-event-linked" : ""}`}>
                              {request.event && <span aria-hidden="true">●</span>}
                              {request.event?.folio ?? "Sin evento"}
                            </span>
                          </td>
                          <td className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {displayDate.format(new Date(request.createdAt))}
                          </td>
                        </>
                      )}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="delivery-row-actions">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Ver solicitud ${request.folio}`}
                            onClick={(e) => openDetail(request, e.currentTarget)}
                          >
                            <Eye size={16} />
                          </Button>
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar solicitud ${request.folio}`}
                              onClick={() => setForm({ request })}
                            >
                              <Pencil size={16} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              aria-label={`Eliminar solicitud ${request.folio}`}
                              onClick={() => setDeleting(request)}
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
          </Fragment>
        )}
      </div>
      {mobileFilters && (
        <RequestMobileFilters
          initial={{ event, status, from, to, order }}
          onApply={applyMobileFilters}
          onClose={() => setMobileFilters(false)}
        />
      )}
      {form && <RequestFormDialog request={form.request} onClose={() => setForm(null)} />}
      {deleting && <DeleteRequestDialog key={deleting.id} request={deleting} onClose={() => setDeleting(null)} />}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent
          placement="right"
          className="requests-drawer"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            opener.current?.focus()
          }}
        >
          <DialogHeader className="requests-drawer-header">
            <DialogDescription className="font-mono">{selected?.folio}</DialogDescription>
            <DialogTitle>Solicitud</DialogTitle>
          </DialogHeader>
          <div className="requests-drawer-body">
            {selected && <RequestDetailView id={selected.id} embedded onClose={() => setSelected(null)} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
