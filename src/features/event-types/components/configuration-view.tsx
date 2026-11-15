"use client"
import { useId, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Pencil, Plus, Search, Siren, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { usePermission } from "@/providers/permissions"
import { eventTypeSchema, type EventTypeInput, type EventTypeItem } from "../schemas"
import { EventTypeApiError } from "../api"
import { useDeleteEventType, useEventTypes, useSaveEventType } from "../queries"
import "@/features/deliveries/components/deliveries.css"
import "./configuration.css"

export function ConfigurationView() {
  const query = useEventTypes()
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<{ item?: EventTypeItem } | null>(null)
  const [deleting, setDeleting] = useState<EventTypeItem | null>(null)
  const canCreate = usePermission("event-types", "create")
  const canUpdate = usePermission("event-types", "update")
  const canDelete = usePermission("event-types", "delete")
  const rows = (query.data?.data ?? []).filter((item) =>
    item.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")),
  )
  return (
    <div className="configuration deliveries delivery-page">
      <div className="delivery-page-head">
        <div>
          <span className="configuration-eyebrow">Administración</span>
          <h1>Configuración</h1>
          <p>
            Catálogos administrables del sistema. Los tipos de evento alimentan el formulario de registro de eventos.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setForm({})}>
            <Plus size={16} />
            Nuevo tipo
          </Button>
        )}
      </div>
      <div className="configuration-toolbar">
        <div className="configuration-search">
          <Search size={16} aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tipo de evento…"
            aria-label="Buscar tipo de evento"
          />
        </div>
      </div>
      <section className="delivery-panel" aria-busy={query.isFetching}>
        <h2>
          <Siren size={17} />
          Tipos de evento <span className="delivery-count">{query.data?.data.length ?? "—"}</span>
        </h2>
        {query.isPending ? (
          <div className="space-y-3 p-5" role="status" aria-label="Cargando tipos de evento">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="delivery-empty" role="alert">
            <h2>No se pudieron cargar los tipos de evento</h2>
            <p>{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : !rows.length ? (
          <div className="delivery-empty">
            <Siren size={30} />
            <h2>No hay tipos de evento</h2>
            <p>
              {search
                ? "No se encontraron tipos con ese nombre."
                : "Registra los tipos que usará el módulo de Eventos."}
            </p>
            {canCreate && (
              <Button onClick={() => setForm({})}>
                <Plus size={16} />
                Nuevo tipo
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="delivery-table configuration-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th className="text-right">Eventos que lo usan</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold">{item.name}</td>
                    <td className="text-right">
                      {item._count.events ? (
                        <span className="delivery-count">{item._count.events}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td>
                      <div className="configuration-actions">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${item.name}`}
                            onClick={() => setForm({ item })}
                          >
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label={`Eliminar ${item.name}`}
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {form && <TypeForm key={form.item?.id ?? "new"} item={form.item} onClose={() => setForm(null)} />}
      {deleting && <DeleteType key={deleting.id} item={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}
function TypeForm({ item, onClose }: { item?: EventTypeItem; onClose: () => void }) {
  const id = useId()
  const mutation = useSaveEventType(item?.id)
  const form = useForm<EventTypeInput>({
    resolver: zodResolver(eventTypeSchema),
    defaultValues: { name: item?.name ?? "" },
  })
  const save = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
      toast.success(item ? "Tipo de evento actualizado." : "Tipo de evento creado.")
      onClose()
    } catch (error) {
      if (error instanceof EventTypeApiError && error.fieldErrors?.name?.[0])
        form.setError("name", { message: error.fieldErrors.name[0] })
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el tipo.")
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
        className="configuration-form gap-0 overflow-hidden p-0 sm:max-w-[460px]"
        onEscapeKeyDown={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
      >
        <DialogHeader className="border-b px-6 py-5 pr-12 text-left">
          <DialogTitle className="flex items-center gap-3">
            <span className="configuration-icon">
              <Siren size={19} />
            </span>
            {item ? "Editar tipo de evento" : "Nuevo tipo de evento"}
          </DialogTitle>
          <DialogDescription>Define el nombre que se mostrará en el módulo de Eventos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} noValidate>
          <fieldset disabled={mutation.isPending} className="space-y-4 px-6 py-5">
            {Boolean(item?._count.events) && (
              <p className="configuration-warning">
                <AlertTriangle size={17} />
                <span>
                  Este tipo está en uso por <strong>{item?._count.events} eventos</strong>. El nuevo nombre se mostrará
                  en todos los eventos asociados.
                </span>
              </p>
            )}
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor={id}>
                Nombre <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id={id}
                autoFocus
                placeholder="Ej. Anegamiento"
                {...form.register("name")}
                aria-invalid={Boolean(form.formState.errors.name)}
                aria-describedby={`${id}-error`}
              />
              <FieldError id={`${id}-error`} errors={[form.formState.errors.name]} />
            </Field>
          </fieldset>
          <div className="bg-surface flex justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : item ? "Guardar cambios" : "Crear tipo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function DeleteType({ item, onClose }: { item: EventTypeItem; onClose: () => void }) {
  const mutation = useDeleteEventType()
  const [conflict, setConflict] = useState<string | null>(null)
  const blocked = item._count.events > 0 || Boolean(conflict)
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{blocked ? "No se puede eliminar el tipo" : "Eliminar tipo de evento"}</AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? `El tipo ${item.name} está en uso y no puede eliminarse.`
              : `¿Confirmas eliminar el tipo ${item.name} del catálogo? Esta acción no se puede deshacer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {blocked && (
          <p className="configuration-warning" role="alert">
            <AlertTriangle size={17} />
            <span>
              {conflict ??
                `Está referenciado por ${item._count.events} ${item._count.events === 1 ? "evento" : "eventos"}. Para eliminarlo, primero debes reasignar esos eventos a otro tipo.`}
            </span>
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>{blocked ? "Cerrar" : "Cancelar"}</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              variant="destructive"
              disabled={mutation.isPending}
              onClick={async (e) => {
                e.preventDefault()
                try {
                  await mutation.mutateAsync(item.id)
                  toast.success("Tipo de evento eliminado.")
                  onClose()
                } catch (error) {
                  if (error instanceof EventTypeApiError && error.status === 409) setConflict(error.message)
                  toast.error(error instanceof Error ? error.message : "No se pudo eliminar el tipo.")
                }
              }}
            >
              {mutation.isPending ? "Eliminando…" : "Eliminar tipo"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
