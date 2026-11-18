"use client"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, type RequestStatus } from "../schemas"
export type RequestMobileFilterValues = {
  event: "all" | "with" | "without"
  status: RequestStatus | ""
  from: string
  to: string
  order: string
}
const empty: RequestMobileFilterValues = { event: "all", status: "", from: "", to: "", order: "desc" }
export function RequestMobileFilters({
  initial,
  onApply,
  onClose,
}: {
  initial: RequestMobileFilterValues
  onApply: (value: RequestMobileFilterValues) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(initial),
    id = useId()
  const valid = !draft.from || !draft.to || draft.from <= draft.to
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="request-mobile-filter-sheet flex flex-col gap-0 overflow-hidden p-0 max-md:translate-x-0 max-md:translate-y-0">
        <DialogHeader className="shrink-0 border-b p-5 text-left">
          <DialogTitle>Filtros de solicitudes</DialogTitle>
          <DialogDescription>Los cambios se aplican al confirmar.</DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            if (valid) onApply(draft)
          }}
        >
          <div className="request-mobile-filter-fields min-h-0 flex-1 overflow-y-auto p-5">
            <label htmlFor={`${id}-status`}>Estado</label>
            <select
              id={`${id}-status`}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as RequestStatus | "" })}
            >
              <option value="">Todas</option>
              {REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REQUEST_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <label htmlFor={`${id}-event`}>Evento asociado</label>
            <select
              id={`${id}-event`}
              value={draft.event}
              onChange={(e) => setDraft({ ...draft, event: e.target.value as RequestMobileFilterValues["event"] })}
            >
              <option value="all">Todas</option>
              <option value="with">Con evento</option>
              <option value="without">Sin evento</option>
            </select>
            <label htmlFor={`${id}-from`}>Desde</label>
            <input
              id={`${id}-from`}
              type="date"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
            <label htmlFor={`${id}-to`}>Hasta</label>
            <input
              id={`${id}-to`}
              type="date"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
            {!valid && (
              <p role="alert" className="text-destructive">
                La fecha hasta no puede ser anterior a desde.
              </p>
            )}
            <label htmlFor={`${id}-order`}>Ordenar por fecha</label>
            <select
              id={`${id}-order`}
              value={draft.order}
              onChange={(e) => setDraft({ ...draft, order: e.target.value })}
            >
              <option value="desc">Más recientes primero</option>
              <option value="asc">Más antiguas primero</option>
            </select>
          </div>
          <div className="request-mobile-filter-footer flex shrink-0 justify-end gap-3 border-t p-4">
            <Button type="button" variant="outline" onClick={() => setDraft(empty)}>
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
