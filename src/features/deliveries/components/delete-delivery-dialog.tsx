"use client"
import { useAttachments, DeletionFiles, deletionReady } from "@/features/attachments/client"
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
import { useDeleteDelivery } from "../queries"
import type { Delivery } from "../schemas"
export function DeleteDeliveryDialog({
  delivery,
  onClose,
  onDeleted,
}: {
  delivery: Delivery | null
  onClose: () => void
  onDeleted?: () => void
}) {
  const files = useAttachments({ resource: "deliveries", recordId: delivery?.id ?? "" }, !!delivery)
  const mutation = useDeleteDelivery()
  async function remove() {
    if (!delivery) return
    try {
      await mutation.mutateAsync({ id: delivery.id, attachmentIds: files.data?.map((f) => f.id) ?? [] })
      toast.success(`Entrega ${delivery.folio} eliminada.`)
      onClose()
      onDeleted?.()
    } catch (error) {
      await files.refetch()
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la entrega.")
    }
  }
  return (
    <AlertDialog
      open={Boolean(delivery)}
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar entrega</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Confirmas eliminar la entrega {delivery?.folio} a {delivery?.beneficiary}? Esta acción no se puede
            deshacer. La eliminación no afecta a la solicitud, al evento ni a los insumos del catálogo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <DeletionFiles query={files} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending || !deletionReady(files)}
            onClick={(event) => {
              event.preventDefault()
              void remove()
            }}
          >
            {mutation.isPending ? "Eliminando…" : "Eliminar entrega"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
