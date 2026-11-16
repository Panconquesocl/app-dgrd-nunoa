"use client"
import { AttachmentPanel, useAttachments, DeletionFiles, deletionReady } from "@/features/attachments/client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Activity, ArrowLeft, CalendarDays, Clock, Paperclip, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { usePermission } from "@/providers/permissions"
import { formatDate } from "@/lib/format"
import { AppTopbar } from "@/components/layout/app-topbar"
import { formatActivityDateLong, formatActivityRecordDate } from "../format"
import { useActivity, useDeleteActivity } from "../queries"
import { ActivityFormDialog } from "./activity-form-dialog"
import "@/features/deliveries/components/deliveries.css"
import "@/features/requests/components/requests.css"
export function ActivityDetailView({ id, user }: { id: string; user?: { name: string; email: string } | null }) {
  const [tab, setTab] = useState("information")
  const files = useAttachments({ resource: "activities", recordId: id })
  const query = useActivity(id)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const mutation = useDeleteActivity(id)
  const router = useRouter()
  const canUpdate = usePermission("activities", "update")
  const canDelete = usePermission("activities", "delete")
  const action = query.data?.action
  const topbar = (
    <AppTopbar
      crumbs={[
        { label: "Plan RRD" },
        { label: "Acciones estratégicas", href: "/plan/acciones" },
        {
          label: action ? `N°${action.number} · ${action.year}` : "Acción",
          href: action ? `/plan/acciones/${action.id}` : undefined,
        },
        { label: "Actividad", current: true },
      ]}
      user={user}
    />
  )
  if (query.isPending)
    return (
      <>
        {topbar}
        <div className="delivery-page" aria-busy="true" aria-label="Cargando actividad">
          <Skeleton className="h-64" />
        </div>
      </>
    )
  if (query.isError || !query.data)
    return (
      <>
        {topbar}
        <div className="delivery-empty" role="alert">
          <h2>No se pudo cargar la actividad</h2>
          <p>{query.error?.message}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
          <Link href="/plan/cronograma">Volver al cronograma</Link>
        </div>
      </>
    )
  const activity = query.data
  return (
    <>
      {topbar}
      <div className="requests deliveries delivery-page">
        <Link href={`/plan/acciones/${activity.actionId}`} className="delivery-back">
          <ArrowLeft size={16} />
          Acción N°{activity.action.number} · {activity.action.year}
        </Link>
        <div className="delivery-page-head">
          <div className="min-w-0 flex-1">
            <h1 className="max-w-[760px] break-words">{activity.objective}</h1>
            <p className="flex items-center gap-1.5">
              <CalendarDays size={14} aria-hidden="true" />
              <time dateTime={activity.date}>{formatActivityDateLong(activity.date)}</time>
            </p>
          </div>
          <div className="flex gap-2">
            {canUpdate && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil size={15} />
                Editar
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label="Eliminar actividad"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </div>
        <div className="delivery-detail-grid">
          <section className="delivery-panel">
            <div className="border-b px-5 py-4">
              <div className="requests-segment" role="tablist" aria-label="Detalle de actividad">
                <button
                  id="activity-information-tab"
                  type="button"
                  role="tab"
                  aria-selected={tab === "information"}
                  onClick={() => setTab("information")}
                  aria-controls="activity-information"
                >
                  <Activity size={14} />
                  Información
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "evidence"}
                  id="activity-evidence-tab"
                  aria-controls="activity-evidence"
                  onClick={() => setTab("evidence")}
                >
                  <Paperclip size={14} />
                  Evidencia
                </button>
              </div>
            </div>
            {tab === "information" ? (
              <dl
                id="activity-information"
                role="tabpanel"
                aria-labelledby="activity-information-tab"
                className="delivery-kv"
              >
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatDate(activity.date)}</dd>
                </div>
                <div>
                  <dt>Dirección</dt>
                  <dd>{activity.location}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt>Acción estratégica</dt>
                  <dd>
                    <Link className="hover:underline" href={`/plan/acciones/${activity.actionId}`}>
                      N°{activity.action.number} · {activity.action.title}
                    </Link>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt>Objetivo</dt>
                  <dd className="whitespace-pre-wrap">{activity.objective}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt>Participantes</dt>
                  <dd className="whitespace-pre-wrap">{activity.participants}</dd>
                </div>
              </dl>
            ) : (
              <div id="activity-evidence" role="tabpanel" aria-labelledby="activity-evidence-tab" className="p-5">
                <AttachmentPanel owner={{ resource: "activities", recordId: id }} kind="evidence" />
              </div>
            )}
          </section>
          <aside className="delivery-aside">
            <h2>Registro</h2>
            <div className="requests-author">
              <span className="requests-avatar" aria-hidden="true">
                {activity.creator.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0] ?? "")
                  .join("")
                  .toLocaleUpperCase("es")}
              </span>
              <div>
                <strong>{activity.creator.name}</strong>
                <p>Registró la actividad</p>
              </div>
            </div>
            <p className="requests-record-date">
              <Clock size={14} aria-hidden="true" />
              <time dateTime={activity.createdAt}>{formatActivityRecordDate(activity.createdAt)}</time>
            </p>
          </aside>
        </div>
        {editing && <ActivityFormDialog activity={activity} onClose={() => setEditing(false)} />}
        <AlertDialog
          open={deleting}
          onOpenChange={(open) => {
            if (!mutation.isPending) setDeleting(open)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar actividad</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Confirmas eliminar esta actividad? Esta acción no se puede deshacer. La acción estratégica se
                conservará.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="text-sm break-words">{activity.objective}</p>
            <DeletionFiles query={files} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={mutation.isPending || !deletionReady(files)}
                onClick={async (e) => {
                  e.preventDefault()
                  try {
                    await mutation.mutateAsync(files.data?.map((f) => f.id) ?? [])
                    toast.success("Actividad eliminada.")
                    router.push(`/plan/acciones/${activity.actionId}`)
                  } catch (error) {
                    await files.refetch()
                    toast.error(error instanceof Error ? error.message : "No se pudo eliminar la actividad.")
                  }
                }}
              >
                {mutation.isPending ? "Eliminando…" : "Eliminar actividad"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  )
}
