"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Pencil,
  Plus,
  Siren,
  Trash2,
  Truck,
  Unlink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatDateTime } from "@/lib/format"
import { usePermission } from "@/providers/permissions"
import { useRequest } from "../queries"
import { RequestFormDialog } from "./request-form-dialog"
import { DeleteRequestDialog } from "./delete-request-dialog"
import { RequestStatusBadge } from "./request-status-badge"
import "@/features/deliveries/components/deliveries.css"
import "./requests.css"
import { EventFormDialog } from "@/features/events/components/event-form-dialog"

export function RequestDetailView({
  id,
  embedded = false,
  onClose,
}: {
  id: string
  embedded?: boolean
  onClose?: () => void
}) {
  const [creatingEvent, setCreatingEvent] = useState(false)
  const canCreateEvent = usePermission("events", "create")
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canUpdate = usePermission("requests", "update")
  const canDelete = usePermission("requests", "delete")
  const router = useRouter()
  const query = useRequest(id)
  const request = query.data
  if (query.isPending)
    return (
      <div className="delivery-page space-y-4" aria-busy="true" aria-label="Cargando solicitud">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  if (query.isError || !request)
    return (
      <div className="delivery-empty" role="alert">
        <h2>No se pudo cargar la solicitud</h2>
        <p>{query.error?.message}</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Reintentar
        </Button>
        <Link href="/solicitudes">Volver a solicitudes</Link>
      </div>
    )
  return (
    <div className={`requests deliveries ${embedded ? "requests-embedded" : "delivery-page"}`}>
      {!embedded && (
        <Link href="/solicitudes" className="delivery-back">
          <ArrowLeft size={16} />
          Solicitudes
        </Link>
      )}
      <div className="delivery-page-head">
        <div>
          {!embedded && <span className="delivery-eyebrow">{request.folio}</span>}
          <h1>Detalle de solicitud</h1>
        </div>
        {(canUpdate || canDelete) && (
          <div className="flex gap-2">
            {canUpdate && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil size={15} />
                Editar
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label="Eliminar solicitud"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="delivery-detail-grid">
        <section className="delivery-panel">
          <h2>
            <FileText size={17} />
            Información de la solicitud
          </h2>
          <dl className="delivery-kv">
            <div>
              <dt>Medio/fuente</dt>
              <dd className="break-words">{request.channel}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <RequestStatusBadge status={request.status} />
              </dd>
            </div>
            <div>
              <dt>Fecha de creación</dt>
              <dd>{formatDateTime(request.createdAt)}</dd>
            </div>
            <div>
              <dt>Última actualización</dt>
              <dd>{formatDateTime(request.updatedAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Lo solicitado</dt>
              <dd className="break-words whitespace-pre-wrap">{request.description || "Sin descripción"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Respuesta</dt>
              <dd className="break-words whitespace-pre-wrap">{request.response || "Sin respuesta"}</dd>
            </div>
          </dl>
        </section>
        <aside className="space-y-4">
          <section className="delivery-aside">
            <h2>Evento asociado</h2>
            {request.event ? (
              <div className="requests-related">
                <Siren size={20} />
                <div>
                  <Link href={`/eventos/${request.event.id}`} className="font-mono font-semibold hover:underline">
                    {request.event.folio}
                  </Link>
                  <span>{request.event.sector}</span>
                </div>
              </div>
            ) : (
              <p className="requests-info">
                <Info size={16} />
                Esta solicitud no tiene un evento asociado.
              </p>
            )}
            {canUpdate && (
              <button className="requests-associate" onClick={() => setEditing(true)}>
                <Unlink size={14} />
                {request.event ? "Cambiar o desasociar evento" : "Asociar evento existente"}
              </button>
            )}
          </section>
          {!request.event && canCreateEvent && (
            <Button className="w-full" onClick={() => setCreatingEvent(true)}>
              <Plus size={16} />
              Crear evento desde solicitud
            </Button>
          )}
          <section className="delivery-aside">
            <h2>Entrega asociada</h2>
            {request.delivery ? (
              <Link href={`/entregas/${request.delivery.id}`} className="requests-related">
                <Truck size={20} />
                <div>
                  <strong>{request.delivery.folio}</strong>
                  <span>
                    {request.delivery.beneficiary} · {formatDate(request.delivery.date)}
                  </span>
                </div>
                <ChevronRight size={16} />
              </Link>
            ) : (
              <p className="requests-info">
                <Info size={16} />
                Esta solicitud aún no tiene una entrega registrada.
              </p>
            )}
          </section>
          <section className="delivery-aside">
            <h2>Registro</h2>
            <div className="requests-author">
              <span className="requests-avatar">
                {request.creator.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <div>
                <strong>{request.creator.name}</strong>
                <p>Registró la solicitud</p>
              </div>
            </div>
            <p className="requests-record-date">
              <Clock size={14} />
              {formatDateTime(request.createdAt)}
            </p>
          </section>
          {request.delivery && canDelete && (
            <p className="text-muted-foreground flex items-start gap-2 text-xs">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              No se puede eliminar esta solicitud mientras tenga una entrega vinculada.
            </p>
          )}
        </aside>
      </div>
      {creatingEvent && (
        <EventFormDialog
          fromRequest={request}
          onClose={() => setCreatingEvent(false)}
          onSaved={(event) => router.push(`/eventos/${event.id}`)}
        />
      )}
      {editing && <RequestFormDialog request={request} onClose={() => setEditing(false)} />}
      {deleting && (
        <DeleteRequestDialog
          request={request}
          onClose={() => setDeleting(false)}
          onDeleted={() => (embedded ? onClose?.() : router.push("/solicitudes"))}
        />
      )}
    </div>
  )
}
