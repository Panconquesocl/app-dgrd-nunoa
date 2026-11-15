"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDateTime } from "@/lib/format"
import { usePermission } from "@/providers/permissions"
import { useRequests } from "../queries"
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, type RequestListItem, type RequestStatus } from "../schemas"
import { RequestFormDialog } from "./request-form-dialog"
import { DeleteRequestDialog } from "./delete-request-dialog"
import { RequestStatusBadge } from "./request-status-badge"
import "@/features/deliveries/components/deliveries.css"

type EventFilter = "all" | "with" | "without"

export function RequestsView() {
  const [search, setSearch] = useState("")
  const [event, setEvent] = useState<EventFilter>("all")
  const [status, setStatus] = useState<RequestStatus | "">("")
  const [form, setForm] = useState<{ request?: RequestListItem } | null>(null)
  const [deleting, setDeleting] = useState<RequestListItem | null>(null)
  const canCreate = usePermission("requests", "create")
  const canUpdate = usePermission("requests", "update")
  const canDelete = usePermission("requests", "delete")
  const query = useRequests({ q: useDebouncedValue(search) || undefined, event, status: status || undefined })
  const router = useRouter()
  const hasFilters = Boolean(search || event !== "all" || status)
  function clear() {
    setSearch("")
    setEvent("all")
    setStatus("")
  }
  return (
    <div className="deliveries delivery-page">
      <div className="delivery-page-head">
        <div>
          <h1>Solicitudes</h1>
          <p>Solicitudes de ayuda recibidas, con su medio de ingreso, respuesta y evento asociado.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setForm({})}>
            <Plus size={16} />
            Nueva solicitud
          </Button>
        )}
      </div>
      <div className="delivery-toolbar">
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            className="w-full pl-9 sm:w-[280px]"
            placeholder="Buscar por folio, medio, descripción o respuesta…"
            aria-label="Buscar solicitudes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="delivery-select w-auto"
          aria-label="Filtrar por evento"
          value={event}
          onChange={(e) => setEvent(e.target.value as EventFilter)}
        >
          <option value="all">Todas las solicitudes</option>
          <option value="with">Con evento</option>
          <option value="without">Sin evento</option>
        </select>
        <select
          className="delivery-select w-auto"
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as RequestStatus | "")}
        >
          <option value="">Todos los estados</option>
          {REQUEST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {REQUEST_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        {hasFilters && (
          <Button variant="ghost" onClick={clear}>
            Limpiar filtros
          </Button>
        )}
      </div>
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
        ) : !query.data?.data.length ? (
          <div className="delivery-empty">
            <FileText size={28} />
            <h2>No hay solicitudes</h2>
            <p>
              {hasFilters ? "No se encontraron solicitudes con esos filtros." : "Aún no se han registrado solicitudes."}
            </p>
            {(hasFilters || canCreate) && (
              <Button variant="outline" onClick={() => (hasFilters ? clear() : setForm({}))}>
                {hasFilters ? "Limpiar filtros" : "Nueva solicitud"}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="delivery-table min-w-[820px]">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Creada</th>
                  <th>Medio/fuente</th>
                  <th>Estado</th>
                  <th>Evento</th>
                  <th>Entrega</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((request) => (
                  <tr
                    key={request.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/solicitudes/${request.id}`)}
                  >
                    <td className="font-mono text-xs font-semibold whitespace-nowrap">
                      <Link
                        href={`/solicitudes/${request.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline"
                      >
                        {request.folio}
                      </Link>
                    </td>
                    <td className="text-xs whitespace-nowrap">{formatDateTime(request.createdAt)}</td>
                    <td className="max-w-[240px] truncate">{request.channel}</td>
                    <td>
                      <RequestStatusBadge status={request.status} />
                    </td>
                    <td>
                      {request.event ? (
                        <span className="delivery-badge delivery-badge-event">{request.event.folio}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="font-mono text-xs">
                      {request.delivery ? (
                        <Link
                          href={`/entregas/${request.delivery.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {request.delivery.folio}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/solicitudes/${request.id}`} aria-label={`Ver solicitud ${request.folio}`}>
                            <Eye size={16} />
                          </Link>
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
        )}
      </div>
      {form && <RequestFormDialog request={form.request} onClose={() => setForm(null)} />}
      {deleting && <DeleteRequestDialog key={deleting.id} request={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}
