"use client"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Info, Siren } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { useEventTypes } from "@/features/event-types/queries"
import { eventFormSchema, type EventFormValues, type EventItem } from "../schemas"
import { EventApiError } from "../api"
import { useSaveEvent } from "../queries"
import "@/features/requests/components/requests.css"
import "./events.css"
const fields = ["typeId", "date", "sector", "affectedCount", "institutions", "actions"] as const
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
export function EventFormDialog({
  event,
  fromRequest,
  onClose,
  onSaved,
}: {
  event?: EventItem
  fromRequest?: { id: string; folio: string; response: string | null }
  onClose: () => void
  onSaved?: (event: EventItem) => void
}) {
  const id = useId()
  const types = useEventTypes()
  const mutation = useSaveEvent(event?.id)
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      typeId: event?.typeId ?? "",
      date: event?.date.slice(0, 10) ?? today(),
      sector: event?.sector ?? "",
      affectedCount: event?.affectedCount?.toString() ?? "",
      institutions: event?.institutions ?? "",
      actions: event?.actions ?? fromRequest?.response ?? "",
    },
  })
  const save = form.handleSubmit(async (values) => {
    try {
      const saved = await mutation.mutateAsync({
        ...values,
        affectedCount: values.affectedCount === "" ? null : Number(values.affectedCount),
        ...(fromRequest && { requestId: fromRequest.id }),
      })
      toast.success(event ? "Evento actualizado." : "Evento registrado.")
      onClose()
      onSaved?.(saved)
    } catch (error) {
      if (error instanceof EventApiError)
        for (const field of fields) {
          const message = error.fieldErrors?.[field]?.[0]
          if (message) form.setError(field, { message })
        }
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el evento.")
    }
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className="requests-form flex h-[min(90svh,800px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]"
        onEscapeKeyDown={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12 text-left">
          <DialogTitle className="flex items-center gap-3">
            <span className="delivery-icon">
              <Siren size={19} />
            </span>
            {event ? "Editar evento" : fromRequest ? "Crear evento desde solicitud" : "Nuevo evento de emergencia"}
          </DialogTitle>
          <DialogDescription>{event?.folio ?? "El folio y el autor se registran automáticamente."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <fieldset disabled={mutation.isPending} className="space-y-5">
              {fromRequest && (
                <p className="events-info">
                  <Info size={17} />
                  <span>
                    La solicitud <strong>{fromRequest.folio}</strong> quedará asociada al evento. Su entrega vinculada
                    heredará la asociación. Las acciones se precargaron desde su respuesta.
                  </span>
                </p>
              )}
              <div className="events-form-grid">
                {fields.map((field) => (
                  <Field
                    key={field}
                    data-invalid={Boolean(form.formState.errors[field])}
                    className={field === "institutions" || field === "actions" ? "sm:col-span-2" : ""}
                  >
                    <FieldLabel htmlFor={`${id}-${field}`}>
                      {
                        {
                          typeId: "Tipo de evento",
                          date: "Fecha",
                          sector: "Sector",
                          affectedCount: "Personas afectadas",
                          institutions: "Instituciones involucradas",
                          actions: "Acciones tomadas",
                        }[field]
                      }
                      {["typeId", "date", "sector"].includes(field) ? (
                        <span className="text-destructive">*</span>
                      ) : (
                        <span className="text-muted-foreground font-normal">Opcional</span>
                      )}
                    </FieldLabel>
                    {field === "typeId" ? (
                      <>
                        <select
                          id={`${id}-${field}`}
                          className="delivery-select"
                          {...form.register(field)}
                          aria-invalid={Boolean(form.formState.errors[field])}
                          aria-describedby={`${id}-${field}-error ${id}-types-hint`}
                        >
                          <option value="">Selecciona un tipo…</option>
                          {types.data?.data.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                          {event && !types.data?.data.some((type) => type.id === event.typeId) && (
                            <option value={event.typeId}>{event.type.name}</option>
                          )}
                        </select>
                        <p id={`${id}-types-hint`} className="text-muted-foreground text-xs">
                          {types.isPending ? (
                            "Cargando tipos…"
                          ) : types.isError ? (
                            <button type="button" onClick={() => types.refetch()} className="underline">
                              No se pudieron cargar los tipos. Reintentar
                            </button>
                          ) : types.data?.data.length === 0 ? (
                            <Link href="/admin/configuracion" className="underline">
                              Registra primero un tipo en Configuración.
                            </Link>
                          ) : (
                            "Selecciona el tipo de emergencia."
                          )}
                        </p>
                      </>
                    ) : field === "institutions" || field === "actions" ? (
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
                        type={field === "date" ? "date" : field === "affectedCount" ? "number" : "text"}
                        min={field === "affectedCount" ? 0 : undefined}
                        step={field === "affectedCount" ? 1 : undefined}
                        placeholder={field === "sector" ? "Ej. Villa Frei" : undefined}
                        {...form.register(field)}
                        aria-invalid={Boolean(form.formState.errors[field])}
                        aria-describedby={`${id}-${field}-error`}
                      />
                    )}
                    <FieldError id={`${id}-${field}-error`} errors={[form.formState.errors[field]]} />
                  </Field>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="bg-surface flex shrink-0 justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Guardando…"
                : event
                  ? "Guardar cambios"
                  : fromRequest
                    ? "Crear y asociar"
                    : "Registrar evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
