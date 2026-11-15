"use client"
import { useState } from "react"
import { Ban, KeyRound, Pencil, RotateCcw, Search, Trash2, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useUsers, useDeleteUser, useSetUserActive } from "../queries"
import type { UserItem } from "../schemas"
import { UserFormDialog } from "./user-form-dialog"
import { UserPasswordDialog } from "./user-password-dialog"
import "@/features/deliveries/components/deliveries.css"
import "@/features/requests/components/requests.css"
import "./users.css"
const date = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Santiago",
})
export function UsersView({ meId, domain }: { meId: string; domain: string }) {
  const query = useUsers()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active")
  const [form, setForm] = useState<{ user?: UserItem } | null>(null)
  const [password, setPassword] = useState<UserItem | null>(null)
  const [confirmation, setConfirmation] = useState<{ user: UserItem; mode: "status" | "delete" } | null>(null)
  const data = query.data?.data ?? []
  const rows = data.filter(
    (user) =>
      (status === "all" || user.active === (status === "active")) &&
      `${user.name} ${user.lastName ?? ""} ${user.email}`
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  )
  return (
    <div className="requests deliveries delivery-page">
      <div className="delivery-page-head">
        <div>
          <span className="requests-eyebrow">Administración</span>
          <h1>Usuarios</h1>
          <p>Cuentas del sistema: alta, rol, activación y restablecimiento de contraseña.</p>
        </div>
        <Button onClick={() => setForm({})}>
          <UserPlus size={16} />
          Nuevo usuario
        </Button>
      </div>
      <div className="users-toolbar">
        <div className="requests-segment" aria-label="Estado de cuentas">
          {(
            [
              ["active", "Activos"],
              ["inactive", "Inactivos"],
              ["all", "Todos"],
            ] as const
          ).map(([value, label]) => (
            <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>
              {label}
              <span>
                {query.isPending
                  ? "—"
                  : data.filter((user) => value === "all" || user.active === (value === "active")).length}
              </span>
            </button>
          ))}
        </div>
        <div className="requests-search">
          <Search size={16} aria-hidden="true" />
          <Input
            aria-label="Buscar usuarios por nombre o correo"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="delivery-panel" aria-busy={query.isFetching}>
        {query.isPending ? (
          <div className="space-y-3 p-5" role="status" aria-label="Cargando usuarios">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="delivery-empty" role="alert">
            <h2>No se pudieron cargar los usuarios</h2>
            <p>{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : !rows.length ? (
          <div className="delivery-empty">
            <Users size={28} />
            <h2>No hay usuarios</h2>
            <p>No se encontraron usuarios con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="delivery-table users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="requests-author">
                        <span className="requests-avatar" aria-hidden="true">
                          {`${user.name[0] ?? ""}${user.lastName?.[0] ?? ""}`.toLocaleUpperCase("es")}
                        </span>
                        <span className="font-semibold">
                          {user.name} {user.lastName}
                          {user.id === meId && <span className="text-muted-foreground font-normal"> (tú)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="text-muted-foreground font-mono text-xs">{user.email}</td>
                    <td>
                      <span className={`users-badge ${user.role === "admin" ? "users-admin" : "users-regular"}`}>
                        {user.role === "admin"
                          ? "Administrador"
                          : user.role === "regular"
                            ? "Usuario regular"
                            : "Rol no reconocido"}
                      </span>
                    </td>
                    <td>
                      <span className={`users-badge ${user.active ? "users-active" : "users-inactive"}`}>
                        {user.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {date.format(new Date(user.createdAt)).replaceAll(".", "")}
                    </td>
                    <td>
                      <div className="users-row-actions">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${user.email}`}
                          onClick={() => setForm({ user })}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Restablecer contraseña de ${user.email}`}
                          onClick={() => setPassword(user)}
                        >
                          <KeyRound size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={user.active ? "text-destructive" : ""}
                          disabled={user.active && user.id === meId}
                          aria-label={`${user.active ? "Desactivar" : "Reactivar"} ${user.email}`}
                          title={
                            user.id === meId
                              ? "No puedes desactivar tu propia cuenta"
                              : user.active
                                ? "Desactivar"
                                : "Reactivar"
                          }
                          onClick={() => setConfirmation({ user, mode: "status" })}
                        >
                          {user.active ? <Ban size={16} /> : <RotateCcw size={16} />}
                        </Button>
                        {!user.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label={`Eliminar ${user.email}`}
                            onClick={() => setConfirmation({ user, mode: "delete" })}
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
      </div>
      {form && <UserFormDialog user={form.user} meId={meId} domain={domain} onClose={() => setForm(null)} />}
      {password && <UserPasswordDialog user={password} meId={meId} onClose={() => setPassword(null)} />}
      {confirmation && (
        <UserConfirmation
          key={`${confirmation.mode}-${confirmation.user.id}`}
          {...confirmation}
          onClose={() => setConfirmation(null)}
        />
      )}
    </div>
  )
}
function UserConfirmation({ user, mode, onClose }: { user: UserItem; mode: "status" | "delete"; onClose: () => void }) {
  const toggle = useSetUserActive(user.id)
  const remove = useDeleteUser(user.id)
  const pending = toggle.isPending || remove.isPending
  const blocked = mode === "delete" && user.recordCount > 0
  const title =
    mode === "delete"
      ? blocked
        ? "No se puede eliminar el usuario"
        : "Eliminar usuario"
      : user.active
        ? "Desactivar usuario"
        : "Reactivar usuario"
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? `La cuenta de ${user.name} ${user.lastName ?? ""} tiene ${user.recordCount} registros en el historial y debe permanecer inactiva.`
              : mode === "delete"
                ? `¿Confirmas eliminar la cuenta inactiva ${user.email}? Esta acción no se puede deshacer.`
                : `¿Confirmas ${user.active ? "desactivar" : "reactivar"} a ${user.name} ${user.lastName ?? ""}?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mode === "status" && (
          <p className="users-notice">
            {user.active
              ? "Sus sesiones se cerrarán y no podrá iniciar sesión. Su historial se conserva atribuido a esta cuenta."
              : "Volverá a poder iniciar sesión. Sus sesiones anteriores no se restauran."}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{blocked ? "Cerrar" : "Cancelar"}</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              variant={mode === "delete" || user.active ? "destructive" : "default"}
              disabled={pending}
              onClick={async (e) => {
                e.preventDefault()
                try {
                  if (mode === "delete") await remove.mutateAsync()
                  else await toggle.mutateAsync(!user.active)
                  toast.success(
                    mode === "delete"
                      ? "Usuario eliminado."
                      : user.active
                        ? "Usuario desactivado."
                        : "Usuario reactivado.",
                  )
                  onClose()
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo completar la operación.")
                }
              }}
            >
              {pending
                ? "Guardando…"
                : mode === "delete"
                  ? "Eliminar usuario"
                  : user.active
                    ? "Desactivar"
                    : "Reactivar"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
