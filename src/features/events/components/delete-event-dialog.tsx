"use client"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import { useDeleteEvent, useEventImpact } from "../queries"
import "./events.css"
export function DeleteEventDialog({
  event,
  onClose,
  onDeleted,
}: {
  event: { id: string; folio: string }
  onClose: () => void
  onDeleted?: () => void
}) {
  const impact = useEventImpact(event.id)
  const mutation = useDeleteEvent(event.id)
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar evento {event.folio}</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Confirmas eliminar este evento? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {impact.isPending ? (
          <p role="status">Comprobando solicitudes y entregas asociadas…</p>
        ) : impact.isError ? (
          <div role="alert">
            <p>No se pudieron comprobar las asociaciones.</p>
            <Button variant="outline" onClick={() => impact.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <p className="events-warning" role="alert">
            <AlertTriangle size={18} />
            <span>
              {impact.data.requestIds.length || impact.data.deliveryIds.length ? (
                <>
                  Hay{" "}
                  <strong>
                    {impact.data.requestIds.length} solicitudes y {impact.data.deliveryIds.length} entregas asociadas
                  </strong>
                  . Se conservarán con todos sus datos e insumos y quedarán sin evento asociado.
                </>
              ) : (
                "Este evento no tiene solicitudes ni entregas asociadas."
              )}
            </span>
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending || !impact.data || impact.isFetching || impact.isError}
            onClick={async (e) => {
              e.preventDefault()
              if (!impact.data) return
              try {
                await mutation.mutateAsync(impact.data)
                toast.success("Evento eliminado. Las solicitudes y entregas se conservaron.")
                onClose()
                onDeleted?.()
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "No se pudo eliminar el evento.")
                await impact.refetch()
              }
            }}
          >
            {mutation.isPending ? "Eliminando…" : "Eliminar evento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
