"use client"

import { useEffect } from "react"
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
import { Field } from "./field"

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
            <Field label="N° de acción" required hint="Único por año." error={errors.number?.message}>
              {(props) => <Input {...props} {...form.register("number")} placeholder="Ej. 1" inputMode="numeric" />}
            </Field>

            <Field label="Año" required error={errors.year?.message}>
              {(props) => <Input {...props} {...form.register("year")} inputMode="numeric" />}
            </Field>
          </div>

          <Field label="Título" required error={errors.title?.message}>
            {(props) => (
              <Input
                {...props}
                {...form.register("title")}
                placeholder="Ej. Fortalecer la red comunitaria de respuesta ante emergencias"
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha de inicio" required error={errors.startDate?.message}>
              {(props) => <Input {...props} {...form.register("startDate")} type="date" />}
            </Field>

            <Field label="Fecha de término" required error={errors.endDate?.message}>
              {(props) => <Input {...props} {...form.register("endDate")} type="date" />}
            </Field>
          </div>

          <Field label="Cómo desarrollarla" required error={errors.implementation?.message}>
            {(props) => (
              <Textarea
                {...props}
                {...form.register("implementation")}
                rows={4}
                placeholder="Describe la estrategia y los pasos para desarrollar esta acción…"
              />
            )}
          </Field>

          <Field label="Temas" required hint="Ejes o temas que aborda la acción." error={errors.topics?.message}>
            {(props) => (
              <Input
                {...props}
                {...form.register("topics")}
                placeholder="Ej. Organización comunitaria · Primera respuesta · Mapas de riesgo"
              />
            )}
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
