"use client"
import { Fragment, useState } from "react"
import { History, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAudit, useAuditActors } from "../queries"
import { AUDIT_ACTIONS, AUDIT_RESOURCES, AUDIT_FIELDS, type AuditQuery } from "../schemas"
import "@/features/deliveries/components/deliveries.css"
const timestamp = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Santiago",
})
function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Sin valor"
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (typeof value === "object")
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${AUDIT_FIELDS[key] ?? key}: ${show(entry)}`)
      .join(" · ")
  return String(value)
}
export function AuditView({ viewerKey }: { viewerKey: string }) {
  const [filters, setFilters] = useState<AuditQuery>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const validPeriod = !filters.from || !filters.to || filters.from <= filters.to
  const query = useAudit(filters, viewerKey, validPeriod)
  const actors = useAuditActors(viewerKey)
  const rows = query.data?.pages.flatMap((page) => page.data) ?? []
  function set<K extends keyof AuditQuery>(key: K, value: AuditQuery[K] | "") {
    setFilters((current) => ({ ...current, [key]: value || undefined }))
    setExpanded(null)
  }
  return (
    <div className="deliveries delivery-page">
      <div className="delivery-page-head">
        <div>
          <h1 className="flex items-center gap-3">
            <History size={24} />
            Auditoría
          </h1>
          <p>Historial de altas, modificaciones y eliminaciones. Las fechas se muestran en horario de Chile.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            query.refetch()
            actors.refetch()
          }}
          disabled={!validPeriod || query.isFetching}
        >
          <RefreshCw size={15} />
          Actualizar
        </Button>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1 text-xs font-semibold">
          Módulo
          <select
            className="delivery-select"
            value={filters.resource ?? ""}
            onChange={(event) => set("resource", event.target.value as AuditQuery["resource"])}
          >
            <option value="">Todos los módulos</option>
            {Object.entries(AUDIT_RESOURCES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Acción
          <select
            className="delivery-select"
            value={filters.action ?? ""}
            onChange={(event) => set("action", event.target.value as AuditQuery["action"])}
          >
            <option value="">Todas las acciones</option>
            {Object.entries(AUDIT_ACTIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Usuario
          <select
            className="delivery-select"
            value={filters.actorId ?? ""}
            onChange={(event) => set("actorId", event.target.value)}
          >
            <option value="">Todos los usuarios</option>
            {actors.data?.map((actor) => (
              <option key={actor.actorId} value={actor.actorId}>
                {actor.actorName} · {actor.actorEmail}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Desde
          <input
            className="delivery-select"
            type="date"
            value={filters.from ?? ""}
            max={filters.to}
            onChange={(event) => set("from", event.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Hasta
          <input
            className="delivery-select"
            type="date"
            value={filters.to ?? ""}
            min={filters.from}
            onChange={(event) => set("to", event.target.value)}
          />
        </label>
      </div>
      {actors.isError && (
        <p role="alert" className="text-muted-foreground mb-3 text-sm">
          No se pudo cargar el filtro de usuarios.{" "}
          <button type="button" className="underline" onClick={() => actors.refetch()}>
            Reintentar
          </button>
        </p>
      )}
      {Object.values(filters).some(Boolean) && (
        <Button
          variant="ghost"
          className="mb-3"
          onClick={() => {
            setFilters({})
            setExpanded(null)
          }}
        >
          <X size={14} />
          Limpiar filtros
        </Button>
      )}
      {!validPeriod ? (
        <p role="alert">La fecha final no puede ser anterior a la inicial.</p>
      ) : query.isError ? (
        <div role="alert" className="delivery-empty">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : query.isPending ? (
        <p role="status">Cargando historial…</p>
      ) : rows.length === 0 ? (
        <div className="delivery-empty">
          <History size={28} />
          <h2>Sin registros de auditoría</h2>
          <p>El historial comienza con la implementación de esta función. Prueba otro período o filtros.</p>
        </div>
      ) : (
        <>
          <div className="delivery-panel overflow-x-auto" aria-busy={query.isFetching}>
            <table className="delivery-table min-w-[800px]">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Registro</th>
                  <th>
                    <span className="sr-only">Detalle de cambios</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr>
                      <td className="font-mono text-xs whitespace-nowrap">
                        {timestamp.format(new Date(row.createdAt)).replace(".", "")}
                      </td>
                      <td>
                        <strong className="block">{row.actorName}</strong>
                        <span className="text-muted-foreground text-xs">{row.actorEmail}</span>
                      </td>
                      <td>{AUDIT_RESOURCES[row.resource]}</td>
                      <td>{AUDIT_ACTIONS[row.action]}</td>
                      <td className="max-w-64 truncate" title={row.entityLabel}>
                        {row.entityLabel}
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-expanded={expanded === row.id}
                          aria-controls={`audit-${row.id}`}
                          onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                        >
                          {expanded === row.id ? "Ocultar" : "Ver cambios"}
                        </Button>
                      </td>
                    </tr>
                    {expanded === row.id && (
                      <tr id={`audit-${row.id}`}>
                        <td colSpan={6} className="bg-muted/30">
                          <p className="text-muted-foreground mb-3 text-xs break-all">
                            Identificador del registro: {row.entityId}
                          </p>
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr>
                                <th>Campo</th>
                                <th>Antes</th>
                                <th>Después</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from(
                                new Set([...Object.keys(row.before ?? {}), ...Object.keys(row.after ?? {})]),
                              ).map((field) => (
                                <tr key={field}>
                                  <td className="align-top font-semibold">{AUDIT_FIELDS[field] ?? field}</td>
                                  <td className="max-w-72 align-top break-words whitespace-pre-wrap">
                                    {show(row.before?.[field])}
                                  </td>
                                  <td className="max-w-72 align-top break-words whitespace-pre-wrap">
                                    {show(row.after?.[field])}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {query.hasNextPage && (
            <div className="mt-4 text-center">
              <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                {query.isFetchingNextPage ? "Cargando…" : "Cargar más"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
