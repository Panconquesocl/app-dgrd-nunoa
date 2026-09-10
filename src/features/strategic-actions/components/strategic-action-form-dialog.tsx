"use client"

import { useEffect, useId } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "../api"
import { useCreateStrategicAction, useUpdateStrategicAction } from "../queries"
import {
  strategicActionFormSchema,
  toStrategicActionPayload,
  type StrategicActionDetail,
  type StrategicActionFormValues,
  type StrategicActionListItem,
} from "../schemas"
/**
 * `FieldDescription` y `FieldError` de shadcn se renderizan junto al control
 * pero no lo referencian: hay que enlazarlos a mano para que el lector de
 * pantalla los anuncie al enfocar el campo, no solo al aparecer.
 */
function describedBy(id: string, hasError: boolean, hasHint: boolean) {
  const ids = [hasError && `${id}-error`, hasHint && `${id}-hint`].filter(Boolean)
  return { "aria-invalid": hasError, "aria-describedby": ids.join(" ") || undefined }
}

/** "2026-01-01T00:00:00.000Z" -> "2026-01-01", que es lo que espera <input type="date">. */
function toDateInputValue(isoDate: string) {
  return isoDate.slice(0, 10)
}

function toFormValues(action: StrategicActionListItem | StrategicActionDetail | undefined): StrategicActionFormValues {
  return {
    number: action ? String(action.number) : "",
    year: String(action?.year ?? new Date().getFullYear()),
    title: action?.title ?? "",
    startDate: action ? toDateInputValue(action.startDate) : "",
    endDate: action ? toDateInputValue(action.endDate) : "",
    implementation: action?.implementation ?? "",
    topics: action?.topics ?? "",
  }
}

function Required() {
  return (
    <span className="text-destructive" aria-hidden="true">
      *
    </span>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sin acción es un alta; con acción, una edición. */
  action?: StrategicActionListItem | StrategicActionDetail
}

export function StrategicActionFormDialog({ open, onOpenChange, action }: Props) {
  const isEdit = Boolean(action)

  const form = useForm<StrategicActionFormValues>({
    resolver: zodResolver(strategicActionFormSchema),
    defaultValues: toFormValues(action),
  })

  // El diálogo se mantiene montado entre aperturas, así que hay que recargar
  // los valores: si no, editar una acción mostraría los datos de la anterior.
  useEffect(() => {
    if (open) form.reset(toFormValues(action))
  }, [open, action, form])

  const createMutation = useCreateStrategicAction()
  const updateMutation = useUpdateStrategicAction(action?.id ?? "")
  const mutation = isEdit ? updateMutation : createMutation

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(toStrategicActionPayload(values))
      toast.success(isEdit ? "Acción actualizada." : "Acción creada.")
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        // El servidor puede rechazar lo que el cliente dio por válido, sobre
        // todo el año + número duplicado. Se marca el campo, no un toast suelto.
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (messages?.[0] && field in values) {
            form.setError(field as keyof StrategicActionFormValues, { message: messages[0] })
          }
        }
        return
      }

      const message = error instanceof ApiError ? error.message : "No se pudo guardar la acción."

      if (error instanceof ApiError && error.status === 409) {
        form.setError("number", { message })
        return
      }

      toast.error(message)
    }
  })

  const { errors } = form.formState
  const formId = useId()
  const id = (field: keyof StrategicActionFormValues) => `${formId}-${field}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-4rem)] gap-0 overflow-y-auto p-0 sm:max-w-[620px]">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle className="text-[17px]">
            {isEdit ? "Editar acción estratégica" : "Nueva acción estratégica"}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {isEdit ? `N°${action?.number} · ${action?.year}` : "Plan de Reducción del Riesgo de Desastres"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.number)}>
              <FieldLabel htmlFor={id("number")}>
                N° de acción <Required />
              </FieldLabel>
              <Input
                id={id("number")}
                inputMode="numeric"
                placeholder="Ej. 1"
                {...describedBy(id("number"), Boolean(errors.number), true)}
                {...form.register("number")}
              />
              <FieldDescription id={`${id("number")}-hint`}>Único por año.</FieldDescription>
              <FieldError id={`${id("number")}-error`} errors={[errors.number]} />
            </Field>

            <Field data-invalid={Boolean(errors.year)}>
              <FieldLabel htmlFor={id("year")}>
                Año <Required />
              </FieldLabel>
              <Input
                id={id("year")}
                inputMode="numeric"
                {...describedBy(id("year"), Boolean(errors.year), false)}
                {...form.register("year")}
              />
              <FieldError id={`${id("year")}-error`} errors={[errors.year]} />
            </Field>
          </div>

          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor={id("title")}>
              Título <Required />
            </FieldLabel>
            <Input
              id={id("title")}
              placeholder="Ej. Fortalecer la red comunitaria de respuesta ante emergencias"
              {...describedBy(id("title"), Boolean(errors.title), false)}
              {...form.register("title")}
            />
            <FieldError id={`${id("title")}-error`} errors={[errors.title]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.startDate)}>
              <FieldLabel htmlFor={id("startDate")}>
                Fecha de inicio <Required />
              </FieldLabel>
              <Input
                id={id("startDate")}
                type="date"
                {...describedBy(id("startDate"), Boolean(errors.startDate), false)}
                {...form.register("startDate")}
              />
              <FieldError id={`${id("startDate")}-error`} errors={[errors.startDate]} />
            </Field>

            <Field data-invalid={Boolean(errors.endDate)}>
              <FieldLabel htmlFor={id("endDate")}>
                Fecha de término <Required />
              </FieldLabel>
              <Input
                id={id("endDate")}
                type="date"
                {...describedBy(id("endDate"), Boolean(errors.endDate), false)}
                {...form.register("endDate")}
              />
              <FieldError id={`${id("endDate")}-error`} errors={[errors.endDate]} />
            </Field>
          </div>

          <Field data-invalid={Boolean(errors.implementation)}>
            <FieldLabel htmlFor={id("implementation")}>
              Cómo desarrollarla <Required />
            </FieldLabel>
            <Textarea
              id={id("implementation")}
              rows={4}
              placeholder="Describe la estrategia y los pasos para desarrollar esta acción…"
              {...describedBy(id("implementation"), Boolean(errors.implementation), false)}
              {...form.register("implementation")}
            />
            <FieldError id={`${id("implementation")}-error`} errors={[errors.implementation]} />
          </Field>

          <Field data-invalid={Boolean(errors.topics)}>
            <FieldLabel htmlFor={id("topics")}>
              Temas <Required />
            </FieldLabel>
            <Input
              id={id("topics")}
              placeholder="Ej. Organización comunitaria · Primera respuesta · Mapas de riesgo"
              {...describedBy(id("topics"), Boolean(errors.topics), true)}
              {...form.register("topics")}
            />
            <FieldDescription id={`${id("topics")}-hint`}>Ejes o temas que aborda la acción.</FieldDescription>
            <FieldError id={`${id("topics")}-error`} errors={[errors.topics]} />
          </Field>

          <DialogFooter className="-mx-6 mt-2 -mb-5 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear acción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
