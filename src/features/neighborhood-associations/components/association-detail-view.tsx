"use client"
import { usePermission } from "@/providers/permissions"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Box, CalendarDays, Pencil, Trash2, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AppTopbar, type TopbarUser } from "@/components/layout/app-topbar"
import { formatDate } from "@/lib/format"
import { useNeighborhoodAssociation } from "../queries"
import { associationHistoryQuerySchema, type AssociationHistoryQuery } from "../schemas"
import { AssociationFormDialog } from "./association-form-dialog"
import { DeleteAssociationDialog } from "./delete-association-dialog"
import "@/features/deliveries/components/deliveries.css"

const emptyFilters = { from: "", to: "", supplyId: "" }
const number = (value: number) => value.toLocaleString("es-CL")

export function AssociationDetailPage({ id, user }: { id: string; user?: TopbarUser }) {
  const query = useNeighborhoodAssociation(id, { order: "desc" })
  return (
    <>
      <AppTopbar
        user={user}
        crumbs={[
          { label: "Ayudas primera respuesta" },
          { label: "Juntas vecinales", href: "/juntas-vecinales" },
          { label: query.data?.name ?? "Junta vecinal", current: true },
        ]}
      />
      <AssociationDetailView id={id} />
    </>
  )
}

export function AssociationDetailView({ id }: { id: string }) {
  const canManage = usePermission("neighborhood-associations", "update")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [draft, setDraft] = useState(emptyFilters)
  const [filters, setFilters] = useState<AssociationHistoryQuery>({})
  const [filterError, setFilterError] = useState("")
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const query = useNeighborhoodAssociation(id, { ...filters, order })
  const association = query.data
  const router = useRouter()
  const filtered = Boolean(filters.from || filters.to || filters.supplyId)

  function clearFilters() {
    setDraft(emptyFilters)
    setFilters({})
    setFilterError("")
  }
  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = associationHistoryQuerySchema.safeParse({
      from: draft.from || undefined,
      to: draft.to || undefined,
      supplyId: draft.supplyId || undefined,
    })
    if (!parsed.success) {
      setFilterError(parsed.error.issues[0].message)
      return
    }
    setFilterError("")
    setFilters(parsed.data)
  }
  function showSupply(supplyId: string) {
    // Drill down from the currently displayed period, not unsubmitted form values.
    setDraft({ from: filters.from ?? "", to: filters.to ?? "", supplyId })
    setFilters({ ...filters, supplyId })
    setFilterError("")
  }

  if (query.isPending)
    return (
      <div className="delivery-page space-y-4" aria-busy="true" aria-label="Cargando junta">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  if (query.isError || !association)
    return (
      <div className="delivery-empty" role="alert">
        <h2>No se pudo cargar la junta</h2>
        <p>{query.error?.message}</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Reintentar
        </Button>
        {filtered && (
          <Button variant="ghost" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
        <Link href="/juntas-vecinales">Volver al catálogo</Link>
      </div>
    )
  return (
    <div className="deliveries delivery-page">
      <Link href="/juntas-vecinales" className="delivery-back">
        <ArrowLeft size={16} />
        Juntas vecinales
      </Link>
      <div className="delivery-page-head">
        <div className="min-w-0">
          <span className="delivery-eyebrow">Junta vecinal N°{association.number}</span>
          <h1 className="break-words">{association.name}</h1>
          <p>
            <span className={`delivery-badge ${association.active ? "delivery-badge-event" : ""}`}>
              {association.active ? "Activa" : "Inactiva"}
            </span>
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={15} />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              aria-label="Eliminar junta"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>

      <form
        onSubmit={applyFilters}
        className="delivery-panel mb-5 space-y-4 p-4 sm:p-5"
        aria-label="Filtrar historial de la junta"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="association-from" className="text-sm font-medium">
              Desde
            </label>
            <Input
              id="association-from"
              type="date"
              value={draft.from}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
              aria-describedby={filterError ? "association-filter-error" : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="association-to" className="text-sm font-medium">
              Hasta
            </label>
            <Input
              id="association-to"
              type="date"
              value={draft.to}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
              aria-describedby={filterError ? "association-filter-error" : undefined}
            />
          </div>
          <div className="min-w-0 space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label htmlFor="association-supply" className="text-sm font-medium">
              Insumo
            </label>
            <select
              id="association-supply"
              className="delivery-select w-full min-w-0"
              value={draft.supplyId}
              onChange={(event) => setDraft({ ...draft, supplyId: event.target.value })}
            >
              <option value="">Todos los insumos</option>
              {association.availableSupplies.map((supply) => (
                <option key={supply.id} value={supply.id}>
                  {supply.type} · {supply.unit}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filterError && (
          <p id="association-filter-error" role="alert" className="text-destructive text-sm">
            {filterError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={query.isFetching}>
            Aplicar filtros
          </Button>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
          <p className="text-muted-foreground text-sm">Las fechas incluyen ambos días.</p>
        </div>
      </form>

      <div role="status" aria-live="polite" className="text-muted-foreground mb-4 text-sm">
        {query.isFetching ? "Actualizando resultados…" : filtered ? "Resultados filtrados" : "Historial completo"}
        {!query.isFetching && (
          <>
            {" "}
            · {filters.from ? `Desde ${formatDate(filters.from)}` : "Sin fecha inicial"} ·{" "}
            {filters.to ? `Hasta ${formatDate(filters.to)}` : "Sin fecha final"}
            {filters.supplyId &&
              ` · ${association.availableSupplies.find((supply) => supply.id === filters.supplyId)?.type ?? "Insumo seleccionado"}`}
          </>
        )}
      </div>
      <div aria-busy={query.isFetching}>
        <div className="delivery-stats">
          <div>
            <strong>{number(association.filteredDeliveryCount)}</strong>
            <span>Entregas {filtered ? "en el resultado" : "registradas"}</span>
          </div>
          <div>
            <strong>{number(association.supplyBreakdown.length)}</strong>
            <span>Insumos distintos en el resultado</span>
          </div>
          <div>
            <strong>{number(association._count.deliveries)}</strong>
            <span>Entregas en todo el historial</span>
          </div>
        </div>
        <section className="delivery-panel mb-5" aria-labelledby="association-breakdown-title">
          <div className="border-b px-4 py-4 sm:px-5">
            <h2 id="association-breakdown-title" className="flex items-center gap-2 font-semibold">
              <Box size={17} />
              Desglose por insumo
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Cantidades separadas por insumo y unidad. Usa “Ver entregas” para consultar su distribución.
            </p>
          </div>
          {!association.supplyBreakdown.length ? (
            <div className="delivery-empty">
              <h3>Sin insumos en este resultado</h3>
              <p>
                {filtered ? "Prueba otro periodo o insumo." : "Los insumos aparecerán cuando se registren entregas."}
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {association.supplyBreakdown.map((supply) => (
                  <li key={supply.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <Link href={`/insumos/${supply.id}`} className="font-semibold break-words hover:underline">
                        {supply.type}
                      </Link>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {number(supply.deliveryCount)} {supply.deliveryCount === 1 ? "entrega" : "entregas"}
                      </p>
                    </div>
                    <p className="font-mono text-sm">
                      <strong>{number(supply.quantity)}</strong> {supply.unit}
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <a href="#historial-entregas" onClick={() => showSupply(supply.id)}>
                        Ver entregas
                        <span className="sr-only">
                          {" "}
                          de {supply.type} ({supply.unit})
                        </span>
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="bg-muted/30 flex flex-wrap items-center gap-2 border-t p-4 text-sm sm:px-5">
                <span className="font-medium">Totales por unidad:</span>
                {association.totalsByUnit.map((total) => (
                  <span key={total.unit} className="bg-secondary rounded-full px-3 py-1">
                    {number(total.quantity)} {total.unit}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
        <section
          id="historial-entregas"
          className="delivery-panel scroll-mt-4"
          aria-labelledby="association-history-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
            <h2 id="association-history-title" className="flex items-center gap-2 font-semibold">
              <Truck size={17} />
              Historial de entregas
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setOrder(order === "desc" ? "asc" : "desc")}>
              <CalendarDays size={14} />
              {order === "desc" ? "Más recientes primero" : "Más antiguas primero"}
            </Button>
          </div>
          {!association.deliveries.length ? (
            <div className="delivery-empty">
              <h3>{filtered ? "Sin entregas para estos filtros" : "Sin entregas"}</h3>
              <p>
                {filtered
                  ? "Cambia el periodo o el insumo para ampliar la consulta."
                  : "Esta junta aún no tiene entregas asociadas."}
              </p>
              {filtered && (
                <Button variant="outline" onClick={clearFilters}>
                  Ver todo el historial
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {association.deliveries.map((delivery) => (
                <li key={delivery.id} className="space-y-3 p-4 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/entregas/${delivery.id}`} className="font-mono font-semibold hover:underline">
                      {delivery.folio}
                    </Link>
                    <time dateTime={delivery.date} className="text-muted-foreground text-sm">
                      {formatDate(delivery.date)}
                    </time>
                  </div>
                  <p className="text-sm break-words">
                    <span className="text-muted-foreground">Beneficiario: </span>
                    {delivery.beneficiary}
                  </p>
                  <ul className="flex flex-wrap gap-2" aria-label="Insumos distribuidos">
                    {delivery.items.map((item) => (
                      <li
                        key={item.supply.id}
                        className="bg-secondary max-w-full rounded-md px-3 py-1.5 text-sm break-words"
                      >
                        {item.supply.type}: <strong>{number(item.quantity)}</strong> {item.supply.unit}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {canManage && editing && <AssociationFormDialog association={association} onClose={() => setEditing(false)} />}
      {canManage && deleting && (
        <DeleteAssociationDialog
          association={association}
          onClose={() => setDeleting(false)}
          onDeleted={() => router.push("/juntas-vecinales")}
        />
      )}
    </div>
  )
}
