"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, ChevronRight, Pencil, Trash2, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/format"
import { useSupply } from "../queries"
import { SupplyFormDialog } from "./supply-form-dialog"
import { DeleteSupplyDialog } from "./delete-supply-dialog"
import "@/features/deliveries/components/deliveries.css"

export function SupplyDetailView({ id }: { id: string }) {
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const query = useSupply(id, order)
  const supply = query.data
  if (query.isPending)
    return (
      <div className="delivery-page space-y-4" aria-busy="true" aria-label="Cargando insumo">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  if (query.isError || !supply)
    return (
      <div className="delivery-empty" role="alert">
        <h2>No se pudo cargar el insumo</h2>
        <p>{query.error?.message}</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Reintentar
        </Button>
        <Link href="/insumos">Volver a insumos</Link>
      </div>
    )
  return (
    <div className="deliveries delivery-page">
      <Link href="/insumos" className="delivery-back">
        <ArrowLeft size={16} />
        Insumos
      </Link>
      <div className="delivery-page-head">
        <div>
          <span className="delivery-eyebrow">Ayudas primera respuesta · Insumo</span>
          <h1 className="break-words">{supply.type}</h1>
          <p>
            Unidad: <span className="delivery-badge">{supply.unit}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil size={15} />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            aria-label="Eliminar insumo"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <div className="delivery-stats">
        <div>
          <strong>{supply._count.items}</strong>
          <span>Entregas que lo incluyen</span>
        </div>
        <div>
          <strong>{supply.totalDistributed}</strong>
          <span>Total distribuido ({supply.unit})</span>
        </div>
      </div>
      <section className="delivery-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Truck size={17} />
            Historial de entregas <span className="delivery-count">{supply._count.items}</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setOrder(order === "desc" ? "asc" : "desc")}>
            <CalendarDays size={14} />
            {order === "desc" ? "Más recientes primero" : "Más antiguas primero"}
          </Button>
        </div>
        {!supply.items.length ? (
          <div className="delivery-empty">
            <Truck size={28} />
            <h2>Sin entregas</h2>
            <p>Este insumo aún no ha sido incluido en ninguna entrega.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="delivery-table min-w-[650px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Evento</th>
                  <th>Beneficiario</th>
                  <th className="text-right">Cantidad</th>
                  <th>
                    <span className="sr-only">Ver entrega</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {supply.items.map(({ quantity, delivery }) => (
                  <tr
                    key={delivery.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/entregas/${delivery.id}`)}
                  >
                    <td className="font-mono text-xs whitespace-nowrap">{formatDate(delivery.date)}</td>
                    <td>
                      {delivery.event ? (
                        <span className="delivery-badge delivery-badge-event">{delivery.event.folio}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="font-semibold">
                      <Link
                        href={`/entregas/${delivery.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="hover:underline"
                      >
                        {delivery.beneficiary}
                      </Link>
                    </td>
                    <td className="text-right font-mono">
                      {quantity} <span className="text-muted-foreground text-xs">{supply.unit}</span>
                    </td>
                    <td>
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={`/entregas/${delivery.id}`}
                          aria-label={`Ver entrega ${delivery.folio}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editing && <SupplyFormDialog supply={supply} onClose={() => setEditing(false)} />}
      {deleting && (
        <DeleteSupplyDialog
          supply={supply}
          onClose={() => setDeleting(false)}
          onDeleted={() => router.push("/insumos")}
        />
      )}
    </div>
  )
}
