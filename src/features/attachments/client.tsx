"use client"
/* eslint-disable @next/next/no-img-element -- Los adjuntos privados requieren cookies y no deben pasar por el optimizador compartido. */
import { useId, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Eye, Paperclip, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import { usePermission } from "@/providers/permissions"
import {
  type UploadTicket,
  type Attachment,
  type Owner,
  type Kind,
  MAX_FILE_SIZE,
  MAX_GROUP_FILES,
  groupLabels,
} from "./schemas"
const url = (owner: Owner) => `/api/attachments?${new URLSearchParams(owner)}`
export const contentUrl = (file: Attachment, download = false) =>
  `/api/attachments/${encodeURIComponent(file.id)}/content${download ? "?download=1" : ""}`
class AttachmentApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}
async function checked(response: Response) {
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new AttachmentApiError(response.status, data?.message || "No se pudo completar la operación de archivos.")
  }
  return response
}
export function useAttachments(owner: Owner, enabled = true) {
  return useQuery<Attachment[]>({
    queryKey: ["attachments", owner.resource, owner.recordId],
    queryFn: async () => (await checked(await fetch(url(owner), { cache: "no-store" }))).json(),
    enabled: enabled && !!owner.recordId,
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.some((file) => file.status === "pending") ? 3000 : false),
  })
}
export async function uploadFile(owner: Owner, kind: Kind, file: File) {
  const ticket: UploadTicket = await (
    await checked(
      await fetch(`${url(owner)}&kind=${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size }),
      }),
    )
  ).json()
  try {
    const response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: ticket.headers,
      body: file,
      credentials: "omit",
      signal: AbortSignal.timeout(10 * 60_000),
    })
    if (!response.ok) throw new Error("No se pudo enviar el archivo al almacenamiento. Puedes reintentar la carga.")
    // Reintentar una confirmación es seguro: el mismo id ya confirmado devuelve éxito.
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await checked(await fetch(`/api/attachments/${encodeURIComponent(ticket.id)}/complete`, { method: "POST" }))
        return
      } catch (error) {
        if (error instanceof AttachmentApiError && ![502, 504].includes(error.status)) throw error
        lastError ??= error
      }
    }
    throw lastError
  } catch (error) {
    await fetch(`/api/attachments/${encodeURIComponent(ticket.id)}/upload`, { method: "DELETE" }).catch(() => undefined)
    if (error instanceof TypeError)
      throw new Error("No se pudo conectar con el almacenamiento. El registro está guardado; reintenta la carga.")
    throw error
  }
}
const previewableImage = (type: string) =>
  ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].includes(type)
const sizeLabel = (size: number) =>
  size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / 1024 / 1024).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MB`
export function FilePicker({
  kind,
  files,
  onChange,
  existing = 0,
  disabled = false,
}: {
  kind: Kind
  files: File[]
  onChange: (files: File[]) => void
  existing?: number
  disabled?: boolean
}) {
  const id = useId()
  const limit = kind === "alfa" ? 1 : MAX_GROUP_FILES
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {groupLabels[kind]} <span className="text-muted-foreground font-normal">Opcional</span>
      </label>
      <Input
        id={id}
        type="file"
        multiple={limit > 1}
        accept={
          kind === "photo"
            ? "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif"
            : kind === "alfa"
              ? "application/pdf"
              : undefined
        }
        disabled={disabled || existing + files.length >= limit}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? [])
          e.target.value = ""
          if (selected.some((f) => !f.size || f.size > MAX_FILE_SIZE)) {
            toast.error("Cada archivo debe contener datos y pesar como máximo 25 MB.")
            return
          }
          if (existing + files.length + selected.length > limit) {
            toast.error(`Este grupo admite hasta ${limit} archivo${limit === 1 ? "" : "s"}.`)
            return
          }
          onChange([...files, ...selected])
        }}
      />
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        Hasta {limit} {limit === 1 ? "PDF" : "archivos"}, 25 MB por archivo.
      </p>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li className="flex items-center gap-2 rounded-lg border p-2 text-sm" key={`${file.name}-${index}`}>
              <Paperclip size={14} />
              <span className="min-w-0 flex-1 truncate">
                {file.name} · {sizeLabel(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar ${file.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <X size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
export function AttachmentList({ files, onRemove }: { files: Attachment[]; onRemove?: (file: Attachment) => void }) {
  const [preview, setPreview] = useState<Attachment | null>(null)
  return (
    <>
      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id} className="bg-background flex min-w-0 items-center gap-3 rounded-lg border p-3">
            {file.available && file.status === "ready" && previewableImage(file.type) ? (
              <img src={contentUrl(file)} alt="" className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <Paperclip className="text-muted-foreground h-5 w-5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={file.name}>
                {file.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {groupLabels[file.kind]} · {sizeLabel(file.size)}
                {file.status === "pending"
                  ? " · Cargando…"
                  : !file.available
                    ? " · Archivo histórico no disponible"
                    : ""}
              </p>
            </div>
            {file.available && file.status === "ready" && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Previsualizar ${file.name}`}
                  onClick={() => setPreview(file)}
                >
                  <Eye size={16} />
                </Button>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a href={contentUrl(file, true)} aria-label={`Descargar ${file.name}`}>
                    <Download size={16} />
                  </a>
                </Button>
                {onRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar ${file.name}`}
                    onClick={() => onRemove(file)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="break-all">{preview?.name}</DialogTitle>
            <DialogDescription>Previsualización del archivo adjunto</DialogDescription>
          </DialogHeader>
          {preview &&
            (previewableImage(preview.type) ? (
              <img alt={preview.name} src={contentUrl(preview)} className="max-h-[65svh] min-h-0 object-contain" />
            ) : preview.type === "application/pdf" ? (
              <iframe title={preview.name} src={contentUrl(preview)} className="h-[65svh] w-full border-0" />
            ) : (
              <p className="text-muted-foreground text-sm">
                No hay previsualización para este formato. Puedes descargar el archivo para revisarlo.
              </p>
            ))}
          {preview && (
            <Button asChild variant="outline">
              <a href={contentUrl(preview, true)}>Descargar archivo</a>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
export function DeletionFiles({ query }: { query: ReturnType<typeof useAttachments> }) {
  return (
    <div className="max-h-[45svh] space-y-3 overflow-y-auto">
      {query.isPending ? (
        <p role="status">Comprobando archivos asociados…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>No se pudieron comprobar los archivos.</p>
          <Button type="button" variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : query.data?.length ? (
        <>
          <p className="text-destructive text-sm">
            También se eliminarán estos {query.data.length} archivos. Revisa las previsualizaciones antes de confirmar.
          </p>
          <AttachmentList files={query.data} />
        </>
      ) : (
        <p className="text-muted-foreground text-sm">No hay archivos asociados.</p>
      )}
    </div>
  )
}
export const deletionReady = (query: ReturnType<typeof useAttachments>) =>
  !!query.data && !query.isFetching && !query.isError && !query.data.some((f) => f.status === "pending" || !f.available)
export function AttachmentPanel({
  owner,
  kind,
  showPickers = true,
}: {
  owner: Owner
  kind?: Kind
  showPickers?: boolean
}) {
  const query = useAttachments(owner)
  const canEdit = usePermission(owner.resource, "update")
  const client = useQueryClient()
  const [removing, setRemoving] = useState<Attachment | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<Partial<Record<Kind, File[]>>>({})
  const groups: Kind[] = kind
    ? [kind]
    : owner.resource === "events"
      ? ["alfa", "photo", "file"]
      : owner.resource === "activities"
        ? ["evidence"]
        : ["photo", "file"]
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["attachments", owner.resource, owner.recordId] }),
      client.invalidateQueries({ queryKey: ["audit"] }),
      client.invalidateQueries({ queryKey: ["strategic-actions"] }),
    ])
  async function upload() {
    setBusy(true)
    try {
      for (const group of groups)
        for (const file of draft[group] ?? []) {
          await uploadFile(owner, group, file)
          setDraft((prev) => ({ ...prev, [group]: (prev[group] ?? []).filter((f) => f !== file) }))
        }
      toast.success("Archivos guardados.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo.")
    } finally {
      await refresh()
      setBusy(false)
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">{kind ? groupLabels[kind] : "Archivos adjuntos"}</h2>
      {query.isPending ? (
        <p role="status">Cargando archivos…</p>
      ) : query.isError ? (
        <Button type="button" variant="outline" onClick={() => query.refetch()}>
          Reintentar archivos
        </Button>
      ) : (
        <>
          <AttachmentList
            files={(query.data ?? []).filter((f) => groups.includes(f.kind))}
            onRemove={canEdit && !busy ? setRemoving : undefined}
          />
          {!query.data?.some((f) => groups.includes(f.kind)) && (
            <p className="text-muted-foreground text-sm">Sin archivos adjuntos.</p>
          )}
        </>
      )}
      {canEdit && showPickers && query.data && (
        <>
          <div className="space-y-5">
            {groups.map((group) => (
              <FilePicker
                key={group}
                kind={group}
                existing={query.data.filter((f) => f.kind === group).length}
                files={draft[group] ?? []}
                disabled={busy}
                onChange={(files) => setDraft((prev) => ({ ...prev, [group]: files }))}
              />
            ))}
          </div>
          {groups.some((group) => draft[group]?.length) && (
            <Button type="button" disabled={busy} onClick={() => void upload()}>
              {busy ? "Subiendo archivos…" : "Subir archivos"}
            </Button>
          )}
        </>
      )}
      <AlertDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar archivo</AlertDialogTitle>
            <AlertDialogDescription>
              Este archivo se eliminará del registro y del almacenamiento. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removing && <AttachmentList files={[removing]} />}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={async (e) => {
                e.preventDefault()
                if (!removing) return
                setBusy(true)
                try {
                  await checked(
                    await fetch(`/api/attachments/${encodeURIComponent(removing.id)}`, { method: "DELETE" }),
                  )
                  setRemoving(null)
                  await refresh()
                  toast.success("Archivo eliminado.")
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo eliminar.")
                } finally {
                  setBusy(false)
                }
              }}
            >
              Eliminar archivo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
/** Conserva el registro creado y los archivos pendientes si una carga parcial falla. */
export function useAttachmentDraft(resource: Owner["resource"], originalId?: string) {
  const [savedId, setSavedId] = useState(originalId)
  const [files, setFiles] = useState<Partial<Record<Kind, File[]>>>({})
  const [busy, setBusy] = useState(false)
  const client = useQueryClient()
  const existing = useAttachments({ resource, recordId: savedId ?? "" }, !!savedId)
  async function finish(id: string) {
    setSavedId(id)
    setBusy(true)
    try {
      for (const [group, items] of Object.entries(files))
        for (const file of items ?? []) {
          await uploadFile({ resource, recordId: id }, group as Kind, file)
          setFiles((prev) => ({ ...prev, [group]: (prev[group as Kind] ?? []).filter((f) => f !== file) }))
        }
    } finally {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["attachments", resource, id] }),
        client.invalidateQueries({ queryKey: ["strategic-actions"] }),
      ])
      setBusy(false)
    }
  }
  const pickers = (
    <div className="space-y-5">
      {savedId && (
        <>
          {!originalId && (
            <p className="text-muted-foreground text-sm">
              El registro está guardado. Si falla una carga, puedes reintentar sin crear otro registro.
            </p>
          )}
          <AttachmentPanel owner={{ resource, recordId: savedId }} showPickers={false} />
        </>
      )}
      {(resource === "events"
        ? ["alfa", "photo", "file"]
        : resource === "activities"
          ? ["evidence"]
          : ["photo", "file"]
      ).map((group) => (
        <FilePicker
          key={group}
          kind={group as Kind}
          files={files[group as Kind] ?? []}
          existing={existing.data?.filter((f) => f.kind === group).length ?? 0}
          disabled={busy || (!!savedId && !existing.data)}
          onChange={(items) => setFiles((prev) => ({ ...prev, [group]: items }))}
        />
      ))}
    </div>
  )
  return { savedId, finish, pickers, busy }
}
