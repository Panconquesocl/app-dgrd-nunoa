"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Box, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { SectionEyebrow } from "@/components/layout/section-eyebrow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useSupplies } from "../queries"
import type { SupplyListItem } from "../schemas"
import { SupplyFormDialog } from "./supply-form-dialog"
import { DeleteSupplyDialog } from "./delete-supply-dialog"
import "@/features/deliveries/components/deliveries.css"

export function SuppliesView() {
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<{ supply?: SupplyListItem } | null>(null)
  const [deleting, setDeleting] = useState<SupplyListItem | null>(null)
  const query = useSupplies({ q: useDebouncedValue(search) || undefined })
  const router = useRouter()
  return (
    <div className="deliveries delivery-page">
      <div className="delivery-page-head">
        <div>
          <SectionEyebrow>Catálogo</SectionEyebrow>
          <h1>Insumos</h1>
          <p>Catálogo de insumos disponibles para registrar en las entregas. No maneja stock.</p>
        </div>
        <Button onClick={() => setForm({})}>
          <Plus size={16} />
          Nuevo insumo
        </Button>
      </div>
      <div className="delivery-toolbar justify-end">
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            className="w-full pl-9 sm:w-[280px]"
            placeholder="Buscar insumo…"
            aria-label="Buscar insumos"
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
          <div className="space-y-3 p-5" role="status" aria-label="Cargando insumos">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : !query.data?.data.length ? (
          <div className="delivery-empty">
            <Box size={28} />
            <h2>No hay insumos</h2>
            <p>
              {search
                ? "No se encontraron insumos con ese nombre."
                : "Aún no se han registrado insumos en el catálogo."}
            </p>
            <Button variant="outline" onClick={() => (search ? setSearch("") : setForm({}))}>
              {search ? "Limpiar búsqueda" : "Nuevo insumo"}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="delivery-table min-w-[600px]">
              <thead>
                <tr>
                  <th>Tipo de insumo</th>
                  <th>Unidad</th>
                  <th className="text-right">Entregas</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((supply) => (
                  <tr key={supply.id} className="cursor-pointer" onClick={() => router.push(`/insumos/${supply.id}`)}>
                    <td className="font-semibold">
                      <Link
                        href={`/insumos/${supply.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="hover:underline"
                      >
                        {supply.type}
                      </Link>
                    </td>
                    <td>
                      <span className="delivery-badge">{supply.unit}</span>
                    </td>
                    <td className="text-right">
                      {supply._count.items ? <span className="delivery-count">{supply._count.items}</span> : "—"}
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="delivery-row-actions">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/insumos/${supply.id}`}
                            aria-label={`Historial de ${supply.type} (${supply.unit})`}
                          >
                            <Eye size={16} />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${supply.type} (${supply.unit})`}
                          onClick={() => setForm({ supply })}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          aria-label={`Eliminar ${supply.type} (${supply.unit})`}
                          onClick={() => setDeleting(supply)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {form && <SupplyFormDialog supply={form.supply} onClose={() => setForm(null)} />}
      {deleting && <DeleteSupplyDialog key={deleting.id} supply={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}
