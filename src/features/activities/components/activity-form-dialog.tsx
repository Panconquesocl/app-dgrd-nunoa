"use client"
import "./activity-mobile.css"
import { useAttachmentDraft } from "@/features/attachments/client"
import { useId } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Activity } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { formatDate } from "@/lib/format"
import { activityFormSchema, type ActivityInput, type ActivityItem } from "../schemas"
import { ActivityApiError } from "../api"
import { useSaveActivity, useSchedule } from "../queries"
import "@/features/deliveries/components/deliveries.css"
import "@/features/requests/components/requests.css"
const fields = ["actionId", "date", "location", "objective", "participants"] as const
export function ActivityFormDialog({
  activity,
  actionId,
  onClose,
  onSaved,
}: {
  activity?: ActivityItem
  actionId?: string
  onClose: () => void
  onSaved?: (activity: ActivityItem) => void
}) {
  const id = useId()
  const options = useSchedule()
  const attachments = useAttachmentDraft("activities", activity?.id)
  const mutation = useSaveActivity(attachments.savedId)
  const form = useForm<ActivityInput>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      actionId: activity?.actionId ?? actionId ?? "",
      date: activity?.date.slice(0, 10) ?? "",
      location: activity?.location ?? "",
      objective: activity?.objective ?? "",
      participants: activity?.participants ?? "",
    },
  })
  const selectedId = useWatch({ control: form.control, name: "actionId" })
  const selected =
    options.data?.actions.find((action) => action.id === selectedId) ??
    (activity?.action.id === selectedId ? activity.action : undefined)
  const save = form.handleSubmit(async (values) => {
    if (selected && (values.date < selected.startDate.slice(0, 10) || values.date > selected.endDate.slice(0, 10))) {
      form.setError("date", { message: "La fecha debe estar dentro del periodo de la acción." })
      return
    }
    try {
      const saved = await mutation.mutateAsync(values)
      await attachments.finish(saved.id)
      toast.success(activity ? "Actividad actualizada." : "Actividad registrada.")
      onClose()
      onSaved?.(saved)
    } catch (error) {
      if (error instanceof ActivityApiError)
        for (const field of fields) {
          const message = error.fieldErrors?.[field]?.[0]
          if (message) form.setError(field, { message })
        }
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la actividad.")
    }
  })
  const pending = mutation.isPending || attachments.busy || form.formState.isSubmitting
  const hasUnsavedChanges = form.formState.isDirty || attachments.hasPendingFiles
  function requestClose() {
    if (pending) return
    if (
      window.matchMedia("(max-width: 767px)").matches &&
      hasUnsavedChanges &&
      !window.confirm("¿Descartar los cambios y los archivos seleccionados sin guardar?")
    )
      return
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose()
      }}
    >
      <DialogContent
        className="activity-mobile-form requests-form flex h-[min(90svh,800px)] flex-col gap-0 overflow-hidden p-0 max-md:translate-x-0 max-md:translate-y-0 sm:max-w-[680px]"
        onEscapeKeyDown={(e) => {
          if (mutation.isPending || attachments.busy || form.formState.isSubmitting) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (mutation.isPending || attachments.busy || form.formState.isSubmitting) e.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12 text-left">
          <DialogTitle className="flex items-center gap-3">
            <span className="delivery-icon">
              <Activity size={19} />
            </span>
            {activity ? "Editar actividad" : "Nueva actividad"}
          </DialogTitle>
          <DialogDescription>Registra una actividad de la acción estratégica dentro de su periodo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <fieldset
              disabled={mutation.isPending || attachments.busy || form.formState.isSubmitting}
              className="space-y-5 px-6 py-5"
            >
              <Field data-invalid={Boolean(form.formState.errors.actionId)}>
                <FieldLabel htmlFor={`${id}-actionId`}>
                  Acción estratégica <span className="text-destructive">*</span>
                </FieldLabel>
                <select
                  id={`${id}-actionId`}
                  className="delivery-select"
                  {...form.register("actionId")}
                  aria-invalid={Boolean(form.formState.errors.actionId)}
                  aria-describedby={`${id}-actionId-error ${id}-options`}
                >
                  <option value="">Selecciona una acción…</option>
                  {options.data?.actions.map((action) => (
                    <option key={action.id} value={action.id}>
                      N°{action.number} · {action.year} — {action.title}
                    </option>
                  ))}
                  {selected && !options.data?.actions.some((action) => action.id === selected.id) && (
                    <option value={selected.id}>
                      N°{selected.number} · {selected.year} — {selected.title}
                    </option>
                  )}
                </select>
                <p id={`${id}-options`} className="text-muted-foreground text-xs">
                  {options.isPending ? (
                    "Cargando acciones…"
                  ) : options.isError ? (
                    <button type="button" className="underline" onClick={() => options.refetch()}>
                      No se pudieron cargar las acciones. Reintentar
                    </button>
                  ) : !options.data?.actions.length ? (
                    "Un administrador debe registrar primero una acción estratégica."
                  ) : (
                    "Selecciona la acción a la que pertenece esta actividad."
                  )}
                </p>
                <FieldError id={`${id}-actionId-error`} errors={[form.formState.errors.actionId]} />
              </Field>
              {(
                [
                  ["date", "Fecha"],
                  ["location", "Dirección"],
                  ["objective", "Objetivo"],
                  ["participants", "Participantes"],
                ] as const
              ).map(([field, label]) => (
                <Field key={field} data-invalid={Boolean(form.formState.errors[field])}>
                  <FieldLabel htmlFor={`${id}-${field}`}>
                    {label}{" "}
                    {field === "participants" ? (
                      <span className="text-muted-foreground font-normal">Opcional</span>
                    ) : (
                      <span className="text-destructive">*</span>
                    )}
                  </FieldLabel>
                  {field === "objective" || field === "participants" ? (
                    <Textarea
                      id={`${id}-${field}`}
                      rows={4}
                      {...form.register(field)}
                      aria-invalid={Boolean(form.formState.errors[field])}
                      aria-describedby={`${id}-${field}-error`}
                    />
                  ) : (
                    <Input
                      id={`${id}-${field}`}
                      type={field === "date" ? "date" : "text"}
                      min={field === "date" ? selected?.startDate.slice(0, 10) : undefined}
                      max={field === "date" ? selected?.endDate.slice(0, 10) : undefined}
                      {...form.register(field)}
                      aria-invalid={Boolean(form.formState.errors[field])}
                      aria-describedby={`${id}-${field}-error${field === "date" ? ` ${id}-period` : ""}`}
                    />
                  )}
                  {field === "date" && (
                    <p id={`${id}-period`} className="text-muted-foreground text-xs">
                      {selected
                        ? `Periodo permitido: ${formatDate(selected.startDate)} – ${formatDate(selected.endDate)}, ambas fechas incluidas.`
                        : "Selecciona una acción para consultar su periodo permitido."}
                    </p>
                  )}
                  <FieldError id={`${id}-${field}-error`} errors={[form.formState.errors[field]]} />
                </Field>
              ))}
              <section aria-label="Adjuntos" className="space-y-4 border-t pt-4">
                {attachments.pickers}
              </section>
            </fieldset>
          </div>
          <div className="bg-surface flex shrink-0 justify-end gap-3 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending || attachments.busy || form.formState.isSubmitting}
              onClick={requestClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || attachments.busy || form.formState.isSubmitting}>
              {mutation.isPending || attachments.busy || form.formState.isSubmitting
                ? "Guardando…"
                : activity
                  ? "Guardar cambios"
                  : "Registrar actividad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
