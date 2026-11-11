"use client"
import { useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useDeleteNeighborhoodAssociation } from "../queries"
import { ApiError } from "../api"
import type { NeighborhoodAssociationListItem } from "../schemas"
export function DeleteAssociationDialog({
  association,
  onClose,
  onDeleted,
}: {
  association: NeighborhoodAssociationListItem
  onClose: () => void
  onDeleted?: () => void
}) {
  const mutation = useDeleteNeighborhoodAssociation()
  const [count, setCount] = useState(association._count.deliveries)
  async function remove() {
    try {
      await mutation.mutateAsync(association.id)
      toast.success("Junta vecinal eliminada.")
      onClose()
      onDeleted?.()
    } catch (error) {
      if (error instanceof ApiError && typeof error.details?.deliveryCount === "number")
        setCount(error.details.deliveryCount)
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la junta.")
    }
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{count > 0 ? "No se puede eliminar la junta" : "Eliminar junta vecinal"}</AlertDialogTitle>
          <AlertDialogDescription>
            {count > 0
              ? `La junta tiene ${count} ${count === 1 ? "entrega asociada" : "entregas asociadas"}. Puedes desactivarla desde Editar para conservar su historial.`
              : `¿Eliminar la junta N°${association.number} · ${association.name}? Esta acción no se puede deshacer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>{count > 0 ? "Entendido" : "Cancelar"}</AlertDialogCancel>
          {count === 0 && (
            <AlertDialogAction
              variant="destructive"
              disabled={mutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                void remove()
              }}
            >
              {mutation.isPending ? "Eliminando…" : "Eliminar junta"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
