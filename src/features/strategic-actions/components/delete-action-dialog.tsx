"use client"

import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ApiError } from "../api"
import { useDeleteStrategicAction } from "../queries"

export type DeletableAction = {
  id: string
  number: number
  year: number
  title: string
  activityCount: number
}

function pluralizeActivities(count: number) {
  return count === 1 ? "1 actividad vinculada" : `${count} actividades vinculadas`
}

export function DeleteActionDialog({
  action,
  onOpenChange,
  onDeleted,
}: {
  action: DeletableAction | null
  onOpenChange: (open: boolean) => void
  /** Se llama tras un borrado exitoso, p. ej. para volver al listado. */
  onDeleted?: () => void
}) {
  const { mutateAsync, isPending } = useDeleteStrategicAction()
  const isBlocked = (action?.activityCount ?? 0) > 0

  async function handleDelete() {
    if (!action) return

    try {
      await mutateAsync(action.id)
      toast.success(`Acción N°${action.number} · ${action.year} eliminada.`)
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar la acción.")
    }
  }

  return (
    <AlertDialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isBlocked ? "No se puede eliminar la acción" : "¿Eliminar la acción?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? (
              <>
                La acción N°{action?.number} · {action?.year} tiene {pluralizeActivities(action?.activityCount ?? 0)} y
                no puede eliminarse. Para eliminarla, primero debes eliminar o reasignar esas actividades.
              </>
            ) : (
              <>
                Se eliminará la acción N°{action?.number} · {action?.year},{" "}
                <span className="text-foreground font-medium">{action?.title}</span>. Esta acción no se puede deshacer.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {isBlocked ? (
            <AlertDialogCancel>Entendido</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                onClick={(event) => {
                  // El AlertDialog cierra al confirmar; se evita para poder
                  // mostrar el estado de carga y mantenerlo abierto si falla.
                  event.preventDefault()
                  void handleDelete()
                }}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                {isPending ? "Eliminando…" : "Eliminar"}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
