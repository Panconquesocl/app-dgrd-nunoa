"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, FileText, Pencil, Plus, Siren, Trash2, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RecordAuthor } from "@/components/layout/record-author"
import { AppTopbar, type TopbarUser } from "@/components/layout/app-topbar"
import { formatDate, formatDateTime } from "@/lib/format"
import { usePermission } from "@/providers/permissions"
import { RequestFormDialog } from "@/features/requests/components/request-form-dialog"
import { DeliveryFormDialog } from "@/features/deliveries/components/delivery-form-dialog"
import { RequestStatusBadge } from "@/features/requests/components/request-status-badge"
import { useEvent } from "../queries"
import { EventFormDialog } from "./event-form-dialog"
import { DeleteEventDialog } from "./delete-event-dialog"
import { EventTypeBadge } from "./event-type-badge"
import "@/features/deliveries/components/deliveries.css"
import "@/features/requests/components/requests.css"
import "./events.css"
export function EventDetailPage({ id, user }: { id: string; user?: TopbarUser }) {
  const query = useEvent(id)
  return (
    <>
      <AppTopbar
        user={user}
        crumbs={[
          { label: "Emergencias" },
          { label: "Eventos", href: "/eventos" },
          { label: query.data?.folio ?? "Evento", current: true },
        ]}
      />
      <EventDetailView id={id} />
    </>
  )
}
export function EventDetailView({
  id,
  embedded = false,
  onClose,
}: {
  id: string
  embedded?: boolean
  onClose?: () => void
}) {
  const query = useEvent(id)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [requestForm, setRequestForm] = useState(false)
  const [deliveryForm, setDeliveryForm] = useState(false)
  const router = useRouter()
  const canUpdate = usePermission("events", "update")
  const canDelete = usePermission("events", "delete")
  const canCreateRequest = usePermission("requests", "create")
  const canCreateDelivery = usePermission("deliveries", "create")
  if (query.isPending)
    return (
      <div className="space-y-4 p-6" aria-label="Cargando evento" aria-busy="true">
        <Skeleton className="h-20" />
        <Skeleton className="h-60" />
      </div>
    )
  if (query.isError || !query.data)
    return (
      <div className="delivery-empty" role="alert">
        <h2>No se pudo cargar el evento</h2>
        <p>{query.error?.message}</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  const event = query.data
  return (
    <div className={`requests deliveries ${embedded ? "requests-embedded" : "delivery-page"}`}>
      {!embedded && (
        <Link href="/eventos" className="delivery-back">
          <ArrowLeft size={16} />
          Eventos
        </Link>
      )}
      <div className="delivery-page-head">
        <div>
          {!embedded && <span className="delivery-eyebrow">{event.folio}</span>}
          <h1>Detalle de evento</h1>
        </div>
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
              aria-label="Eliminar evento"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>
      <div className="delivery-stats events-stats" aria-label="Estadísticas del evento">
        <div>
          <strong>{event.affectedCount ?? "—"}</strong>
          <span>Personas afectadas</span>
        </div>
        <div className="delivery-stat">
          <strong>{event.deliveries.length}</strong>
          <span>Entregas registradas</span>
        </div>
        <div className="delivery-stat">
          <strong>
            {event.deliveries.reduce(
              (total, delivery) => total + delivery.items.reduce((sum, item) => sum + item.quantity, 0),
              0,
            )}
          </strong>
          <span>Unidades de insumo entregadas</span>
        </div>
        <div className="delivery-stat">
          <strong>{event.requests.length}</strong>
          <span>Solicitudes asociadas</span>
        </div>
      </div>
      <div className="delivery-detail-grid">
        <div>
          <section className="delivery-panel events-detail-section">
            <h2>
              <Siren size={17} />
              Información del evento
            </h2>
            <dl className="delivery-kv">
              <div>
                <dt>Tipo de evento</dt>
                <dd>
                  <EventTypeBadge name={event.type.name} />
                </dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatDate(event.date)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt>Dirección</dt>
                <dd className="break-words">{event.address}</dd>
              </div>
              <div>
                <dt>Personas afectadas</dt>
                <dd>{event.affectedCount ?? "Sin información"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt>Instituciones involucradas</dt>
                <dd className="whitespace-pre-wrap">{event.institutions || "Sin información"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt>Acciones tomadas</dt>
                <dd className="whitespace-pre-wrap">{event.actions || "Sin información"}</dd>
              </div>
            </dl>
          </section>
          <section className="delivery-panel events-detail-section">
            <div className="events-panel-title">
              <h2>
                <Truck size={17} />
                Entregas asociadas <span className="delivery-count">{event.deliveries.length}</span>
              </h2>
              {canCreateDelivery && (
                <Button variant="outline" onClick={() => setDeliveryForm(true)}>
                  <Plus size={15} /> Registrar entrega
                </Button>
              )}
            </div>
            {event.deliveries.length ? (
              event.deliveries.map((delivery) => (
                <Link className="events-related-row" key={delivery.id} href={`/entregas/${delivery.id}`}>
                  <div>
                    <strong>{delivery.beneficiary}</strong>
                    <small>
                      {delivery.folio} · {formatDate(delivery.date)}
                    </small>
                  </div>
                  <ChevronRight size={16} />
                </Link>
              ))
            ) : (
              <div className="delivery-empty">
                <Truck size={24} />
                <h2>Sin entregas registradas</h2>
                <p>Registra las entregas de insumos realizadas durante este evento, con o sin solicitud.</p>
              </div>
            )}
          </section>
          <section className="delivery-panel events-detail-section">
            <div className="events-panel-title">
              <h2>
                <FileText size={17} />
                Solicitudes asociadas <span className="delivery-count">{event.requests.length}</span>
              </h2>
              {canCreateRequest && (
                <Button variant="outline" onClick={() => setRequestForm(true)}>
                  <Plus size={15} />
                  Nueva solicitud
                </Button>
              )}
            </div>
            {event.requests.length ? (
              event.requests.map((request) => (
                <Link className="events-related-row" key={request.id} href={`/solicitudes/${request.id}`}>
                  <div>
                    <strong className="font-mono">{request.folio}</strong>
                    <small>{request.channel}</small>
                  </div>
                  <RequestStatusBadge status={request.status} />
                  <ChevronRight size={16} />
                </Link>
              ))
            ) : (
              <div className="delivery-empty">
                <FileText size={24} />
                <h2>Sin solicitudes asociadas</h2>
                <p>No hay solicitudes vinculadas a este evento.</p>
              </div>
            )}
          </section>
        </div>
        <aside className="delivery-aside">
          <h2>Registro</h2>
          <RecordAuthor name={event.creator.name} description="Registró el evento" />
          <p className="mt-3">{formatDateTime(event.createdAt)}</p>
        </aside>
      </div>
      {editing && <EventFormDialog event={event} onClose={() => setEditing(false)} />}
      {deleting && (
        <DeleteEventDialog
          event={event}
          onClose={() => setDeleting(false)}
          onDeleted={() => (embedded ? onClose?.() : router.push("/eventos"))}
        />
      )}
      {requestForm && <RequestFormDialog initialEventId={event.id} onClose={() => setRequestForm(false)} />}
      {deliveryForm && <DeliveryFormDialog open onOpenChange={setDeliveryForm} fromEvent={event} />}
    </div>
  )
}
