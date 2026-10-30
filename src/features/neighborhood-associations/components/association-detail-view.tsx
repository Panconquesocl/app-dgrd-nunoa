"use client"
import { usePermission } from "@/providers/permissions"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, Pencil, Trash2, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/format"
import { useNeighborhoodAssociation } from "../queries"
import { AssociationFormDialog } from "./association-form-dialog"
import { DeleteAssociationDialog } from "./delete-association-dialog"
import "@/features/deliveries/components/deliveries.css"
export function AssociationDetailView({ id }: { id: string }) {
  const canManage = usePermission("neighborhood-associations", "update")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const query = useNeighborhoodAssociation(id, order)
  const association = query.data
  const router = useRouter()
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
        <div>
          <span className="delivery-eyebrow">Junta vecinal N°{association.number}</span>
          <h1 className="break-words">{association.name}</h1>
          <p>
            <span className={`delivery-badge ${association.active ? "delivery-badge-event" : ""}`}>
              {association.active ? "Activa" : "Inactiva"}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={15} />
              Editar
            </Button>
          )}
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              aria-label="Eliminar junta"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>
      <div className="delivery-stats">
        <div>
          <strong>{association._count.deliveries}</strong>
          <span>Entregas asociadas</span>
        </div>
        <div>
          <strong>{association.totalUnits}</strong>
          <span>Unidades distribuidas</span>
        </div>
      </div>
      <section className="delivery-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
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
            <h2>Sin entregas</h2>
            <p>Esta junta aún no tiene entregas asociadas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="delivery-table min-w-[600px]">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Beneficiario</th>
                  <th className="text-right">Unidades</th>
                </tr>
              </thead>
              <tbody>
                {association.deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>
                      <Link href={`/entregas/${delivery.id}`} className="font-mono font-semibold hover:underline">
                        {delivery.folio}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(delivery.date)}</td>
                    <td>{delivery.beneficiary}</td>
                    <td className="text-right font-mono">
                      {delivery.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
