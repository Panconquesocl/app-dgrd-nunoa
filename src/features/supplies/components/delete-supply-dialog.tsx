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
import { useDeleteSupply } from "../queries"
import { ApiError } from "../api"
import type { SupplyListItem } from "../schemas"

export function DeleteSupplyDialog({
  supply,
  onClose,
  onDeleted,
}: {
  supply: SupplyListItem
  onClose: () => void
  onDeleted?: () => void
}) {
  const mutation = useDeleteSupply()
  const [blockedCount, setBlockedCount] = useState(supply._count.items)
  const blocked = blockedCount > 0
  async function remove() {
    try {
      await mutation.mutateAsync(supply.id)
      toast.success("Insumo eliminado.")
      onClose()
      onDeleted?.()
    } catch (error) {
      if (error instanceof ApiError && typeof error.details?.deliveryCount === "number")
        setBlockedCount(error.details.deliveryCount)
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el insumo.")
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
          <AlertDialogTitle>{blocked ? "No se puede eliminar el insumo" : "Eliminar insumo"}</AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? `El insumo ${supply.type} está referenciado en ${blockedCount} ${blockedCount === 1 ? "entrega" : "entregas"}. Para eliminarlo, primero debes quitarlo de esas entregas.`
              : `¿Confirmas eliminar ${supply.type} (${supply.unit}) del catálogo? Esta acción no se puede deshacer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>{blocked ? "Entendido" : "Cancelar"}</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              variant="destructive"
              disabled={mutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                void remove()
              }}
            >
              {mutation.isPending ? "Eliminando…" : "Eliminar insumo"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
