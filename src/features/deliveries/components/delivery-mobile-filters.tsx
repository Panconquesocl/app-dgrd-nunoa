"use client"
import { useId, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { DeliveryOptions } from "../schemas"

export type MobileDeliveryFilters = {
  beneficiary: string
  beneficiaryRut: string
  eventId: string
  from: string
  to: string
  event: "all" | "with" | "without"
  supplyId: string
  neighborhoodAssociationId: string
  order: "asc" | "desc"
}
export const emptyMobileFilters: MobileDeliveryFilters = {
  beneficiary: "",
  beneficiaryRut: "",
  eventId: "",
  from: "",
  to: "",
  event: "all",
  supplyId: "",
  neighborhoodAssociationId: "",
  order: "desc",
}
export function DeliveryMobileFilters({
  initial,
  options,
  onApply,
  onClose,
  error,
  retry,
}: {
  initial: MobileDeliveryFilters
  options?: DeliveryOptions
  onApply: (value: MobileDeliveryFilters) => void
  onClose: () => void
  error?: string
  retry: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const id = useId()
  const valid = !draft.from || !draft.to || draft.from <= draft.to
  function field(key: keyof MobileDeliveryFilters, label: string, type = "text") {
    return (
      <div>
        <label htmlFor={`${id}-${key}`}>{label}</label>
        <Input
          id={`${id}-${key}`}
          type={type}
          value={draft[key]}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          maxLength={type === "text" ? 500 : undefined}
        />
      </div>
    )
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="delivery-mobile-filter-sheet flex flex-col gap-0 overflow-hidden p-0 max-md:translate-x-0 max-md:translate-y-0">
        <DialogHeader className="shrink-0 border-b p-5 text-left">
          <DialogTitle>Filtros de entregas</DialogTitle>
          <DialogDescription>Los cambios se aplican al confirmar.</DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onApply(draft)
          }}
        >
          <div className="delivery-mobile-filter-fields min-h-0 flex-1 overflow-y-auto p-5">
            {field("from", "Desde", "date")}
            {field("to", "Hasta", "date")}
            {!valid && (
              <p role="alert" className="text-destructive">
                La fecha hasta no puede ser anterior a desde.
              </p>
            )}
            {field("beneficiary", "Beneficiario")}
            {field("beneficiaryRut", "RUT completo o parcial")}
            <label htmlFor={`${id}-eventId`}>Evento</label>
            <select
              id={`${id}-eventId`}
              value={draft.eventId}
              onChange={(e) => setDraft({ ...draft, eventId: e.target.value })}
            >
              <option value="">Todos los eventos</option>
              {options?.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.folio} · {e.address}
                </option>
              ))}
            </select>
            <label htmlFor={`${id}-event`}>Relación con evento</label>
            <select
              id={`${id}-event`}
              value={draft.event}
              onChange={(e) => setDraft({ ...draft, event: e.target.value as MobileDeliveryFilters["event"] })}
            >
              <option value="all">Todas</option>
              <option value="with">Con evento</option>
              <option value="without">Sin evento</option>
            </select>
            <label htmlFor={`${id}-junta`}>Junta vecinal</label>
            <select
              id={`${id}-junta`}
              value={draft.neighborhoodAssociationId}
              onChange={(e) => setDraft({ ...draft, neighborhoodAssociationId: e.target.value })}
            >
              <option value="">Todas las juntas</option>
              {options?.neighborhoodAssociations.map((j) => (
                <option key={j.id} value={j.id}>
                  N°{j.number} · {j.name}
                </option>
              ))}
            </select>
            <label htmlFor={`${id}-supply`}>Insumo</label>
            <select
              id={`${id}-supply`}
              value={draft.supplyId}
              onChange={(e) => setDraft({ ...draft, supplyId: e.target.value })}
            >
              <option value="">Cualquier insumo</option>
              {options?.supplies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.type} · {s.unit}
                </option>
              ))}
            </select>
            <label htmlFor={`${id}-order`}>Ordenar por fecha</label>
            <select
              id={`${id}-order`}
              value={draft.order}
              onChange={(e) => setDraft({ ...draft, order: e.target.value as "asc" | "desc" })}
            >
              <option value="desc">Más recientes primero</option>
              <option value="asc">Más antiguas primero</option>
            </select>
            {!options && !error && <p role="status">Cargando opciones…</p>}
            {error && (
              <div role="alert">
                <p>{error}</p>
                <Button type="button" variant="outline" onClick={retry}>
                  Reintentar opciones
                </Button>
              </div>
            )}
          </div>
          <div className="delivery-mobile-filter-footer flex shrink-0 justify-end gap-3 border-t p-4">
            <Button type="button" variant="outline" onClick={() => setDraft(emptyMobileFilters)}>
              Limpiar
            </Button>
            <Button type="submit" disabled={!valid}>
              Aplicar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
