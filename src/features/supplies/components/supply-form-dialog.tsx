"use client"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Box, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ApiError } from "../api"
import { useCreateSupply, useUpdateSupply } from "../queries"
import { SUPPLY_UNITS, supplyFormSchema, type SupplyListItem, type SupplyFormValues } from "../schemas"

export function SupplyFormDialog({ supply, onClose }: { supply?: SupplyListItem; onClose: () => void }) {
  const id = useId()
  const form = useForm<SupplyFormValues>({
    resolver: zodResolver(supplyFormSchema),
    defaultValues: {
      type: supply?.type ?? "",
      unit: (supply?.unit ?? "unidad") as SupplyFormValues["unit"],
    },
  })
  const create = useCreateSupply()
  const update = useUpdateSupply(supply?.id ?? "")
  const mutation = supply ? update : create
  const inUse = Boolean(supply && supply._count.items > 0)
  const errors = form.formState.errors
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
      toast.success(supply ? "Insumo actualizado." : "Insumo creado.")
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const field of ["type", "unit"] as const) {
          const message = error.fieldErrors[field]?.[0]
          if (message) form.setError(field, { message })
        }
      }
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el insumo.")
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
        className="max-h-[90svh] overflow-y-auto p-0 sm:max-w-[460px]"
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-3">
            <span className="delivery-icon">
              <Box size={19} />
            </span>
            {supply ? "Editar insumo" : "Nuevo insumo"}
          </DialogTitle>
          <DialogDescription>Catálogo de insumos para registrar en las entregas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <fieldset disabled={mutation.isPending} className="space-y-5 px-6 py-5">
            {inUse && (
              <div
                role="note"
                className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
              >
                <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                <p>
                  Este insumo está incluido en {supply?._count.items}{" "}
                  {supply?._count.items === 1 ? "entrega" : "entregas"}. Cambiar su nombre también cambiará cómo se
                  muestra en esos registros. Su unidad no puede modificarse.
                </p>
              </div>
            )}
            <Field data-invalid={Boolean(errors.type)}>
              <FieldLabel htmlFor={`${id}-type`}>
                Tipo de insumo <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id={`${id}-type`}
                placeholder="Ej. Frazada"
                {...form.register("type")}
                aria-invalid={Boolean(errors.type)}
                aria-describedby={`${id}-type-error`}
              />
              <FieldError id={`${id}-type-error`} errors={[errors.type]} />
            </Field>
            <Field data-invalid={Boolean(errors.unit)}>
              <FieldLabel htmlFor={`${id}-unit`}>
                Unidad de medida <span className="text-destructive">*</span>
              </FieldLabel>
              {inUse ? (
                <>
                  <select
                    id={`${id}-unit`}
                    className="delivery-select disabled:opacity-60"
                    value={supply?.unit}
                    disabled
                    aria-describedby={`${id}-unit-hint`}
                  >
                    <option>{supply?.unit}</option>
                  </select>
                  <input type="hidden" {...form.register("unit")} />
                </>
              ) : (
                <select
                  id={`${id}-unit`}
                  className="delivery-select"
                  {...form.register("unit")}
                  aria-invalid={Boolean(errors.unit)}
                  aria-describedby={`${id}-unit-hint ${id}-unit-error`}
                >
                  {SUPPLY_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              )}
              <FieldDescription id={`${id}-unit-hint`}>
                {inUse ? "Para otra unidad, crea un nuevo insumo." : "Cómo se cuantifica este insumo en las entregas."}
              </FieldDescription>
              <FieldError id={`${id}-unit-error`} errors={[errors.unit]} />
            </Field>
          </fieldset>
          <div className="bg-muted/30 flex justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : supply ? "Guardar cambios" : "Crear insumo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
