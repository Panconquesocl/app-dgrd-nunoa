"use client"
import { useState } from "react"
import Link from "next/link"
import { Activity, CalendarDays, ChevronRight, MapPin, Plus, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { usePermission } from "@/providers/permissions"
import { formatDate } from "@/lib/format"
import { activityClusters, MONTH_NAMES, MONTHS, yearPosition } from "../timeline"
import { useSchedule } from "../queries"
import { ActivityFormDialog } from "./activity-form-dialog"
import { SectionEyebrow } from "@/components/layout/section-eyebrow"
import "@/features/deliveries/components/deliveries.css"
import "@/features/requests/components/requests.css"
import { MobileAgenda } from "./mobile-agenda"
import "./schedule.css"
import "./activity-mobile.css"
export function ScheduleView({ agendaOnly = false }: { agendaOnly?: boolean } = {}) {
  const query = useSchedule()
  const [chosenYear, setYear] = useState<number | null>(null)
  const [tab, setTab] = useState("gantt")
  const [form, setForm] = useState(false)
  const canCreate = usePermission("activities", "create")
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  const currentYear = Number(today.slice(0, 4))
  const years = [
    ...new Set([
      ...(query.data?.actions.map((action) => action.year) ?? []),
      ...(query.data?.activities.map((activity) => Number(activity.date.slice(0, 4))) ?? []),
    ]),
  ].sort((a, b) => b - a)
  const year = chosenYear ?? (years.includes(currentYear) ? currentYear : (years[0] ?? currentYear))
  const actions = (query.data?.actions ?? [])
    .filter((action) => action.year === year)
    .sort((a, b) => a.number - b.number)
  const activities = (query.data?.activities ?? []).filter((activity) => Number(activity.date.slice(0, 4)) === year)
  const todayPosition = year === currentYear ? yearPosition(today, year) : null
  return (
    <div className={`requests deliveries delivery-page schedule-view ${agendaOnly ? "schedule-agenda-only" : ""}`}>
      <div className="delivery-page-head">
        <div className="min-w-0 flex-1 basis-[420px]">
          <SectionEyebrow>Plan RRD</SectionEyebrow>
          <h1>
            <span className="schedule-desktop-title">Cronograma</span>
            <span className="schedule-mobile-title">Actividades</span>
          </h1>
          <p className="schedule-desktop-title">
            Línea de tiempo anual: cada acción estratégica como barra entre su inicio y término, con sus actividades
            marcadas en la fecha en que se realizaron.
          </p>
          <p className="schedule-mobile-title">Agenda de actividades del Plan RRD · {year}</p>
        </div>
        {!agendaOnly && (
          <div className="schedule-years" aria-label="Año del cronograma">
            {years.map((value) => (
              <Button
                key={value}
                variant={year === value ? "default" : "outline"}
                size="sm"
                aria-pressed={year === value}
                onClick={() => setYear(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        )}
        {agendaOnly && canCreate && (
          <Button className="agenda-desktop-create" onClick={() => setForm(true)}>
            <Plus size={16} />
            Nueva actividad
          </Button>
        )}
      </div>
      {canCreate && (
        <Button className="activity-register-fab" aria-label="Nueva actividad" onClick={() => setForm(true)}>
          <Plus size={28} aria-hidden="true" />
        </Button>
      )}
      {query.isPending ? (
        <div aria-busy="true" aria-label="Cargando cronograma">
          <Skeleton className="h-80" />
        </div>
      ) : query.isError ? (
        <div className="delivery-empty" role="alert">
          <h2>No se pudo cargar el cronograma</h2>
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="delivery-panel">
          {!agendaOnly && (
            <div className="schedule-desktop-shell">
              <div className="schedule-panel-head">
                <div className="requests-segment" aria-label="Vista del cronograma">
                  <button aria-pressed={tab === "gantt"} onClick={() => setTab("gantt")}>
                    <CalendarDays size={14} />
                    Línea de tiempo {year}
                    <span>{actions.length}</span>
                  </button>
                  <button aria-pressed={tab === "activities"} onClick={() => setTab("activities")}>
                    <Activity size={14} />
                    Actividades del año<span>{activities.length}</span>
                  </button>
                </div>
                {canCreate && (
                  <Button variant="outline" size="sm" onClick={() => setForm(true)}>
                    <Plus size={14} />
                    Nueva actividad
                  </Button>
                )}
                {tab === "gantt" && (
                  <div className="gantt-legend">
                    <span>
                      <i className="gantt-legend-bar" />
                      Periodo de la acción
                    </span>
                    <span>
                      <i className="gantt-legend-dot" />
                      Actividad
                    </span>
                    <span>
                      <i className="gantt-legend-cluster">2</i>Varias en fechas cercanas
                    </span>
                  </div>
                )}
              </div>
              <div className="schedule-desktop-content">
                {tab === "gantt" ? (
                  !actions.length ? (
                    <div className="delivery-empty">
                      <CalendarDays size={28} />
                      <h2>Sin acciones en {year}</h2>
                      <p>No hay acciones estratégicas registradas para este año.</p>
                    </div>
                  ) : (
                    <TooltipProvider>
                      <div
                        className="schedule-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label={`Línea de tiempo ${year}, desplazamiento horizontal`}
                      >
                        <div className="gantt">
                          <div className="gantt-grid gantt-grid-head">
                            <div className="gantt-corner">Acción estratégica</div>
                            <div className="gantt-track gantt-track-head">
                              <div className="gantt-months">
                                {MONTHS.map((month) => (
                                  <span key={month}>{month}</span>
                                ))}
                              </div>
                              {todayPosition !== null && (
                                <span className="gantt-today-pill" style={{ left: `${todayPosition}%` }}>
                                  Hoy
                                </span>
                              )}
                            </div>
                          </div>
                          {actions.map((action) => {
                            const start = yearPosition(action.startDate, year)
                            const end = yearPosition(
                              new Date(new Date(action.endDate).getTime() + 86400000).toISOString(),
                              year,
                            )
                            const visible =
                              action.startDate.slice(0, 10) <= `${year}-12-31` &&
                              action.endDate.slice(0, 10) >= `${year}-01-01`
                            const clusters = activityClusters(
                              activities.filter((activity) => activity.actionId === action.id),
                              year,
                            )
                            return (
                              <div key={action.id} className="gantt-grid gantt-row">
                                <Link className="gantt-label" href={`/plan/acciones/${action.id}`}>
                                  <span className="gantt-label-num">N°{action.number}</span>
                                  <span className="gantt-label-text">
                                    <strong>{action.title}</strong>
                                    <small>
                                      {formatDate(action.startDate)} – {formatDate(action.endDate)}
                                    </small>
                                  </span>
                                </Link>
                                <div className="gantt-track">
                                  {todayPosition !== null && (
                                    <span className="gantt-today" style={{ left: `${todayPosition}%` }} />
                                  )}
                                  {visible && (
                                    <Link
                                      className="gantt-bar"
                                      style={{
                                        left: `${start}%`,
                                        width: `${Math.min(100 - start, Math.max(end - start, 0.3))}%`,
                                      }}
                                      href={`/plan/acciones/${action.id}`}
                                      aria-label={`Periodo de acción N°${action.number}: ${formatDate(action.startDate)} a ${formatDate(action.endDate)}`}
                                    />
                                  )}
                                  {clusters.map((cluster) => (
                                    <Tooltip key={cluster.items[0].id}>
                                      <TooltipTrigger asChild>
                                        <Link
                                          className={`gantt-dot ${cluster.items.length > 1 ? "gantt-dot-cluster" : ""}`}
                                          style={{ left: `${Math.min(99, Math.max(1, cluster.position))}%` }}
                                          href={
                                            cluster.items.length > 1
                                              ? `/plan/acciones/${action.id}`
                                              : `/plan/actividades/${cluster.items[0].id}`
                                          }
                                          aria-label={
                                            cluster.items.length > 1
                                              ? `${cluster.items.length} actividades de acción N°${action.number}. Ver acción`
                                              : `${formatDate(cluster.items[0].date)}: ${cluster.items[0].objective}`
                                          }
                                        >
                                          {cluster.items.length > 1 && cluster.items.length}
                                        </Link>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[320px]">
                                        {cluster.items.slice(0, 5).map((item) => (
                                          <p key={item.id}>
                                            {formatDate(item.date)} · {item.objective}
                                          </p>
                                        ))}
                                        {cluster.items.length > 5 && (
                                          <p>+{cluster.items.length - 5} más · Ver acción</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </TooltipProvider>
                  )
                ) : !activities.length ? (
                  <div className="delivery-empty">
                    <Activity size={28} />
                    <h2>Sin actividades en {year}</h2>
                    <p>Las actividades registradas aparecerán aquí, ordenadas por fecha.</p>
                  </div>
                ) : (
                  MONTH_NAMES.map((month, index) => {
                    const items = activities.filter((activity) => Number(activity.date.slice(5, 7)) === index + 1)
                    return !items.length ? null : (
                      <section key={month}>
                        <h2 className="agenda-month">
                          {month}
                          <span>{items.length}</span>
                        </h2>
                        {items.map((activity) => (
                          <Link key={activity.id} className="agenda-row" href={`/plan/actividades/${activity.id}`}>
                            <span className="agenda-date">
                              <strong>{activity.date.slice(8, 10)}</strong>
                              <small>{MONTHS[index]}</small>
                            </span>
                            <span className="agenda-main">
                              <strong>{activity.objective}</strong>
                              <small>
                                <Target size={12} />
                                Acción N°{activity.action.number}
                                <span>·</span>
                                <MapPin size={12} />
                                {activity.location}
                              </small>
                            </span>
                            <ChevronRight size={16} />
                          </Link>
                        ))}
                      </section>
                    )
                  })
                )}
              </div>
            </div>
          )}
          <div className="schedule-mobile-content">
            <MobileAgenda activities={activities} year={year} />
          </div>
        </div>
      )}
      {form && <ActivityFormDialog onClose={() => setForm(false)} />}
    </div>
  )
}
