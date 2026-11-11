"use client"
import { usePermission } from "@/providers/permissions"
import { useState } from "react"
import Link from "next/link"
import { Eye, Pencil, Plus, Search, Trash2, Users } from "lucide-react"
import { AidTabs } from "@/components/layout/aid-tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useNeighborhoodAssociations } from "../queries"
import type { NeighborhoodAssociationListItem, ListNeighborhoodAssociationsQuery } from "../schemas"
import { AssociationFormDialog } from "./association-form-dialog"
import { DeleteAssociationDialog } from "./delete-association-dialog"
import "@/features/deliveries/components/deliveries.css"

export function AssociationsView() {
  const canManage = usePermission("neighborhood-associations", "update")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<NonNullable<ListNeighborhoodAssociationsQuery["status"]>>("all")
  const [form, setForm] = useState<{ association?: NeighborhoodAssociationListItem } | null>(null)
  const [deleting, setDeleting] = useState<NeighborhoodAssociationListItem | null>(null)
  const query = useNeighborhoodAssociations({ q: useDebouncedValue(search) || undefined, status })
  const filtered = Boolean(search) || status !== "all"
  return (
    <div className="deliveries delivery-page">
      <AidTabs active="neighborhood-associations" />
      <div className="delivery-page-head">
        <div>
          <h1>Juntas vecinales</h1>
          <p>Catálogo de juntas vecinales y sus entregas asociadas.</p>
        </div>
        {canManage && (
          <Button onClick={() => setForm({})}>
            <Plus size={16} />
            Nueva junta
          </Button>
        )}
      </div>
      <div className="delivery-toolbar justify-end">
        <select
          className="delivery-select sm:max-w-[200px]"
          aria-label="Filtrar juntas por estado"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            className="w-full pl-9 sm:w-[280px]"
            aria-label="Buscar juntas vecinales"
            placeholder="Buscar por número o nombre…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="delivery-panel" aria-busy={query.isFetching}>
        {query.isError ? (
          <div className="delivery-empty" role="alert">
            <h2>No se pudo cargar el catálogo</h2>
            <p>{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : query.isPending ? (
          <div className="space-y-3 p-5" role="status" aria-label="Cargando juntas vecinales">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : !query.data?.data.length ? (
          <div className="delivery-empty">
            <Users size={28} />
            <h2>No hay juntas vecinales</h2>
            <p>
              {filtered
                ? "No se encontraron juntas con los filtros aplicados."
                : canManage
                  ? "Registra la primera junta para poder asociar entregas."
                  : "Un administrador debe registrar las juntas para poder asociar entregas."}
            </p>
            {(filtered || canManage) && (
              <Button
                variant="outline"
                onClick={() => {
                  if (filtered) {
                    setSearch("")
                    setStatus("all")
                  } else setForm({})
                }}
              >
                {filtered ? "Limpiar filtros" : "Nueva junta"}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="delivery-table min-w-[650px]">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th className="text-right">Entregas</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((association) => (
                  <tr key={association.id}>
                    <td className="font-mono">{association.number}</td>
                    <td className="font-semibold">
                      <Link href={`/juntas-vecinales/${association.id}`} className="hover:underline">
                        {association.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`delivery-badge ${association.active ? "delivery-badge-event" : ""}`}>
                        {association.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="delivery-count">{association._count.deliveries}</span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            href={`/juntas-vecinales/${association.id}`}
                            aria-label={`Historial de junta ${association.number}`}
                          >
                            <Eye size={16} />
                          </Link>
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar junta ${association.number}`}
                            onClick={() => setForm({ association })}
                          >
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label={`Eliminar junta ${association.number}`}
                            onClick={() => setDeleting(association)}
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
      {canManage && form && <AssociationFormDialog association={form.association} onClose={() => setForm(null)} />}
      {canManage && deleting && <DeleteAssociationDialog association={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}
