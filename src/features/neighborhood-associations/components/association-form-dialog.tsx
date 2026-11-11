"use client"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ApiError } from "../api"
import { useCreateNeighborhoodAssociation, useUpdateNeighborhoodAssociation } from "../queries"
import {
  neighborhoodAssociationFormSchema,
  toNeighborhoodAssociationPayload,
  type NeighborhoodAssociationListItem,
  type NeighborhoodAssociationFormValues,
} from "../schemas"

export function AssociationFormDialog({
  association,
  onClose,
}: {
  association?: NeighborhoodAssociationListItem
  onClose: () => void
}) {
  const id = useId()
  const form = useForm<NeighborhoodAssociationFormValues>({
    resolver: zodResolver(neighborhoodAssociationFormSchema),
    defaultValues: {
      number: association ? String(association.number) : "",
      name: association?.name ?? "",
      active: association?.active ?? true,
    },
  })
  const create = useCreateNeighborhoodAssociation()
  const update = useUpdateNeighborhoodAssociation(association?.id ?? "")
  const mutation = association ? update : create
  const errors = form.formState.errors
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(toNeighborhoodAssociationPayload(values))
      toast.success(association ? "Junta vecinal actualizada." : "Junta vecinal creada.")
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const field of ["number", "name", "active"] as const) {
          const message = error.fieldErrors[field]?.[0]
          if (message) form.setError(field, { message })
        }
      }
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la junta.")
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
        className="max-h-[90svh] overflow-y-auto p-0 sm:max-w-[480px]"
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>{association ? "Editar junta vecinal" : "Nueva junta vecinal"}</DialogTitle>
          <DialogDescription>Número, nombre y disponibilidad para nuevas entregas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <fieldset disabled={mutation.isPending} className="space-y-5 px-6 py-5">
            {Boolean(association?._count.deliveries) && (
              <p role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                Esta junta tiene entregas asociadas. Corregir su número o nombre también actualiza cómo aparece en su
                historial. Desactivarla conserva las entregas existentes.
              </p>
            )}
            <Field data-invalid={Boolean(errors.number)}>
              <FieldLabel htmlFor={`${id}-number`}>
                Número <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id={`${id}-number`}
                inputMode="numeric"
                placeholder="Ej. 12"
                {...form.register("number")}
                aria-invalid={Boolean(errors.number)}
                aria-describedby={`${id}-number-error`}
              />
              <FieldError id={`${id}-number-error`} errors={[errors.number]} />
            </Field>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor={`${id}-name`}>
                Nombre <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id={`${id}-name`}
                placeholder="Nombre de la junta vecinal"
                {...form.register("name")}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={`${id}-name-error`}
              />
              <FieldError id={`${id}-name-error`} errors={[errors.name]} />
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <input
                  id={`${id}-active`}
                  type="checkbox"
                  className="size-4 accent-[var(--brand)]"
                  {...form.register("active")}
                  aria-describedby={`${id}-active-hint`}
                />
                <FieldLabel htmlFor={`${id}-active`}>Activa</FieldLabel>
              </div>
              <p id={`${id}-active-hint`} className="text-muted-foreground text-xs">
                Las juntas inactivas conservan su historial y no se ofrecen para nuevas entregas.
              </p>
              <FieldError errors={[errors.active]} />
            </Field>
          </fieldset>
          <div className="bg-muted/30 flex justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : association ? "Guardar cambios" : "Crear junta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
