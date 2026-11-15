"use client"
import { useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  Box,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  FileText,
  Siren,
  Target,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/format"
import { RequestStatusBadge } from "@/features/requests/components/request-status-badge"
import { EventTypeBadge } from "@/features/events/components/event-type-badge"
import { useSummary } from "../queries"
import "@/features/deliveries/components/deliveries.css"
import "@/features/requests/components/requests.css"
import "./summary.css"
const quantity = new Intl.NumberFormat("es-CL")
const timestampDate = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  year: "numeric",
})
function Kpi({
  icon,
  value,
  label,
  sub,
  href,
  accent = false,
}: {
  icon: ReactNode
  value: number
  label: string
  sub?: ReactNode
  href: string
  accent?: boolean
}) {
  return (
    <Link href={href} className="summary-kpi">
      <div className="summary-kpi-top">
        <span className={`summary-kpi-icon${accent ? "summary-kpi-icon-accent" : ""}`}>{icon}</span>
        <ArrowRight size={15} />
      </div>
      <div>
        <strong>{quantity.format(value)}</strong>
        <span className="summary-kpi-label">{label}</span>
      </div>
      {sub && <span className="summary-kpi-sub">{sub}</span>}
    </Link>
  )
}
function Card({
  icon,
  title,
  count,
  href,
  allLabel = "Ver todo",
  children,
  foot,
}: {
  icon: ReactNode
  title: string
  count: number
  href: string
  allLabel?: string
  children: ReactNode
  foot?: ReactNode
}) {
  return (
    <section className="delivery-panel summary-card">
      <div className="summary-card-head">
        <h2>
          {icon}
          {title}
          <span className="delivery-count">{quantity.format(count)}</span>
        </h2>
        <Link href={href}>
          {allLabel}
          <ArrowRight size={14} />
        </Link>
      </div>
      {children}
      {foot && <div className="summary-foot">{foot}</div>}
    </section>
  )
}
function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="summary-empty">
      {icon}
      <span>{text}</span>
    </div>
  )
}
function Row({
  href,
  icon,
  title,
  meta,
  badge,
  accent = false,
  green = false,
}: {
  href: string
  icon: ReactNode
  title: string
  meta: ReactNode
  badge?: ReactNode
  accent?: boolean
  green?: boolean
}) {
  return (
    <Link className="summary-row" href={href}>
      <span className={`summary-row-icon${accent ? "summary-row-icon-accent" : green ? "summary-row-icon-green" : ""}`}>
        {icon}
      </span>
      <span className="summary-row-main">
        <strong>{title}</strong>
        <span>{meta}</span>
      </span>
      {badge && <span className="summary-row-badge">{badge}</span>}
      <ChevronRight size={16} className="summary-row-chevron" />
    </Link>
  )
}
export function SummaryView({ initialYear, viewerKey }: { initialYear: number; viewerKey: string }) {
  const [year, setYear] = useState(initialYear)
  const query = useSummary(year, viewerKey)
  const data = query.data
  return (
    <div className="requests deliveries delivery-page">
      <div className="delivery-page-head">
        <div>
          <span className="requests-eyebrow">General</span>
          <h1>Resumen</h1>
          <p>Vista general del sistema: lo esencial de cada módulo en un solo lugar.</p>
        </div>
        <label className="summary-year">
          Año
          <select className="delivery-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[...new Set([year, initialYear, ...(data?.availableYears ?? [])])]
              .sort((a, b) => b - a)
              .map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
          </select>
        </label>
      </div>
      {query.isPending ? (
        <div aria-busy="true" aria-label="Cargando resumen">
          <div className="summary-kpis">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-36 rounded-lg" />
            ))}
          </div>
          <div className="summary-grid">
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      ) : query.isError || !data ? (
        <div className="delivery-empty" role="alert">
          <h2>No se pudo cargar el resumen</h2>
          <p>{query.error?.message}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <p className="summary-period">
            Datos de {year}. Las acciones se contabilizan por el año del plan.
            {data.requests && " Las solicitudes, por su fecha de creación."}
          </p>
          <div className="summary-kpis">
            <Kpi
              accent
              icon={<Truck size={17} />}
              value={data.deliveries.count}
              label="Entregas"
              href="/entregas"
              sub={
                data.deliveries.totalsByUnit.length
                  ? data.deliveries.totalsByUnit
                      .map((item) => `${quantity.format(item.quantity)} ${item.unit}`)
                      .join(" · ")
                  : "Sin insumos distribuidos"
              }
            />
            <Kpi
              icon={<Activity size={17} />}
              value={data.activities.count}
              label="Actividades"
              href="/plan/cronograma"
            />
            {data.requests && (
              <Kpi
                icon={<FileText size={17} />}
                value={data.requests.count}
                label="Solicitudes"
                href="/solicitudes"
                sub={`${data.requests.pending} ${data.requests.pending === 1 ? "pendiente" : "pendientes"}`}
              />
            )}
            {data.events && (
              <Kpi icon={<Siren size={17} />} value={data.events.count} label="Eventos" href="/eventos" />
            )}
          </div>
          <div className="summary-grid">
            <Card
              icon={<Truck size={16} />}
              title="Entregas recientes"
              count={data.deliveries.count}
              href="/entregas"
              foot={
                <>
                  <Box size={14} />
                  <span>
                    {data.supplies.catalogCount} insumos en catálogo ·{" "}
                    {data.deliveries.totalsByUnit.length
                      ? data.deliveries.totalsByUnit
                          .map((item) => `${quantity.format(item.quantity)} ${item.unit}`)
                          .join(" · ")
                      : "Sin distribución en el año"}
                  </span>
                </>
              }
            >
              {data.deliveries.recent.length ? (
                data.deliveries.recent.map((delivery) => (
                  <Row
                    key={delivery.id}
                    green
                    href={`/entregas/${delivery.id}`}
                    icon={<Truck size={16} />}
                    title={delivery.beneficiary}
                    meta={
                      <>
                        <span className="font-mono">{delivery.folio}</span> · {formatDate(delivery.date)} · J.V. N°
                        {delivery.neighborhoodAssociation.number}
                      </>
                    }
                    badge={
                      <span className="summary-badge">
                        {delivery._count.items} {delivery._count.items === 1 ? "insumo" : "insumos"}
                      </span>
                    }
                  />
                ))
              ) : (
                <Empty icon={<Truck size={20} />} text="Sin entregas registradas en este año." />
              )}
            </Card>
            <Card
              icon={<Box size={16} />}
              title="Insumos más distribuidos"
              count={data.supplies.distributedCount}
              href="/insumos"
            >
              {data.supplies.top.length ? (
                data.supplies.top.map((supply) => (
                  <Row
                    key={supply.id}
                    href={`/insumos/${supply.id}`}
                    icon={<Box size={16} />}
                    title={supply.type}
                    meta={
                      <>
                        Unidad: <span className="summary-tag">{supply.unit}</span>
                      </>
                    }
                    badge={
                      <span className="summary-metric">
                        <b>{quantity.format(supply.quantity)}</b> {supply.unit}
                      </span>
                    }
                  />
                ))
              ) : (
                <Empty icon={<Box size={20} />} text="Aún no hay insumos distribuidos en este año." />
              )}
            </Card>
            <Card
              icon={<Target size={16} />}
              title="Acciones estratégicas"
              count={data.actions.count}
              href="/plan/acciones"
            >
              {data.actions.recent.length ? (
                data.actions.recent.map((action) => (
                  <Row
                    key={action.id}
                    accent
                    href={`/plan/acciones/${action.id}`}
                    icon={<Target size={16} />}
                    title={action.title}
                    meta={
                      <>
                        <span className="font-mono">
                          N°{action.number} · {action.year}
                        </span>{" "}
                        · {formatDate(action.startDate)} – {formatDate(action.endDate)}
                      </>
                    }
                    badge={
                      <span className="summary-badge">
                        {action._count.activities} {action._count.activities === 1 ? "actividad" : "actividades"}
                      </span>
                    }
                  />
                ))
              ) : (
                <Empty icon={<Target size={20} />} text="Sin acciones del Plan RRD para este año." />
              )}
            </Card>
            <Card
              icon={<CalendarDays size={16} />}
              title="Cronograma · próximas actividades"
              count={data.activities.count}
              href="/plan/cronograma"
              allLabel="Ver línea de tiempo"
            >
              {data.activities.agenda.length ? (
                data.activities.agenda.map((activity) => (
                  <Row
                    key={activity.id}
                    href={`/plan/actividades/${activity.id}`}
                    icon={<Activity size={16} />}
                    title={activity.objective}
                    meta={
                      <>
                        <span className="font-mono">{formatDate(activity.date)}</span> · Acción N°
                        {activity.action.number}
                      </>
                    }
                    badge={
                      <span className={`summary-badge ${activity.upcoming ? "summary-badge-upcoming" : ""}`}>
                        {activity.upcoming ? "Próxima" : "Anterior"}
                      </span>
                    }
                  />
                ))
              ) : (
                <Empty icon={<CalendarDays size={20} />} text="Sin actividades en agenda para este año." />
              )}
            </Card>
            {data.requests && (
              <Card
                icon={<FileText size={16} />}
                title="Solicitudes"
                count={data.requests.count}
                href="/solicitudes"
                foot={
                  <>
                    <CircleAlert size={14} />
                    <span>
                      {data.requests.pending}{" "}
                      {data.requests.pending === 1 ? "solicitud pendiente" : "solicitudes pendientes"} de atención
                    </span>
                  </>
                }
              >
                {data.requests.recent.length ? (
                  data.requests.recent.map((request) => (
                    <Row
                      key={request.id}
                      href={`/solicitudes/${request.id}`}
                      icon={<FileText size={16} />}
                      title={request.channel}
                      meta={
                        <>
                          <span className="font-mono">{request.folio}</span> ·{" "}
                          {timestampDate.format(new Date(request.createdAt)).replaceAll(".", "")}
                        </>
                      }
                      badge={<RequestStatusBadge status={request.status} />}
                    />
                  ))
                ) : (
                  <Empty icon={<FileText size={20} />} text="Sin solicitudes registradas en este año." />
                )}
              </Card>
            )}
            {data.events && (
              <Card icon={<Siren size={16} />} title="Eventos recientes" count={data.events.count} href="/eventos">
                {data.events.recent.length ? (
                  data.events.recent.map((event) => (
                    <Row
                      key={event.id}
                      accent
                      href={`/eventos/${event.id}`}
                      icon={<Siren size={16} />}
                      title={event.sector}
                      meta={
                        <>
                          <span className="font-mono">{event.folio}</span> · {event.type.name} ·{" "}
                          {formatDate(event.date)}
                        </>
                      }
                      badge={<EventTypeBadge name={event.type.name} />}
                    />
                  ))
                ) : (
                  <Empty icon={<Siren size={20} />} text="Sin eventos registrados en este año." />
                )}
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
