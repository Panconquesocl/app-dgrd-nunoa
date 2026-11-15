"use client"
import { z } from "zod"
import { useId, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field"
import { userCreateSchema, type UserCreateInput, type UserItem } from "../schemas"
import { UserApiError } from "../api"
import { useCreateUser, useUpdateUser } from "../queries"
import "@/features/deliveries/components/deliveries.css"
import "@/features/requests/components/requests.css"
import "./users.css"
const fields = ["name", "lastName", "email", "password", "role"] as const
export function UserFormDialog({
  user,
  meId,
  domain,
  onClose,
}: {
  user?: UserItem
  meId: string
  domain: string
  onClose: () => void
}) {
  const id = useId()
  const router = useRouter()
  // El correo y la contraseña no se envían al editar; el servidor rechaza campos ajenos al contrato.
  const form = useForm<UserCreateInput>({
    resolver: zodResolver(user ? userCreateSchema.extend({ password: z.string() }) : userCreateSchema),
    defaultValues: {
      name: user?.name ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
      role: user?.role === "admin" ? "admin" : "regular",
      password: "",
    },
  })
  const create = useCreateUser()
  const update = useUpdateUser(user?.id ?? "")
  const mutation = user ? update : create
  const [visible, setVisible] = useState(false)
  const own = user?.id === meId
  const save = form.handleSubmit(async (values) => {
    if (!user && values.email.split("@")[1] !== domain) {
      form.setError("email", { message: `Usa un correo @${domain}.` })
      return
    }
    try {
      if (user) await update.mutateAsync({ name: values.name, lastName: values.lastName, role: values.role })
      else await create.mutateAsync(values)
      form.reset()
      toast.success(user ? "Usuario actualizado." : "Usuario creado.")
      onClose()
      if (own) router.refresh()
    } catch (error) {
      if (error instanceof UserApiError)
        for (const field of fields) {
          const message = error.fieldErrors?.[field]?.[0]
          if (message) form.setError(field, { message })
        }
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la cuenta.")
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
        className="requests-form users-form flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px]"
        onEscapeKeyDown={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12 text-left">
          <DialogTitle className="flex items-center gap-3">
            <span className="delivery-icon">
              <UserRound size={19} />
            </span>
            {user ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
          <DialogDescription>{user ? user.email : "Crea una cuenta institucional y asigna su rol."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <fieldset disabled={mutation.isPending} className="space-y-5 px-6 py-5">
              {(
                [
                  ["name", "Nombre"],
                  ["lastName", "Apellido"],
                  ["email", "Correo electrónico"],
                ] as const
              ).map(([field, label]) => (
                <Field key={field} data-invalid={Boolean(form.formState.errors[field])}>
                  <FieldLabel htmlFor={`${id}-${field}`}>
                    {label} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id={`${id}-${field}`}
                    type={field === "email" ? "email" : "text"}
                    readOnly={Boolean(user && field === "email")}
                    autoFocus={field === "name"}
                    autoComplete={field === "email" ? "email" : field === "name" ? "given-name" : "family-name"}
                    placeholder={field === "email" ? `nombre.apellido@${domain}` : undefined}
                    {...form.register(field)}
                    aria-invalid={Boolean(form.formState.errors[field])}
                    aria-describedby={`${id}-${field}-error${field === "email" ? ` ${id}-email-hint` : ""}`}
                  />
                  {field === "email" && (
                    <FieldDescription id={`${id}-email-hint`}>
                      {user
                        ? "El correo no se puede cambiar una vez creada la cuenta."
                        : `Solo correos institucionales @${domain}.`}
                    </FieldDescription>
                  )}
                  <FieldError id={`${id}-${field}-error`} errors={[form.formState.errors[field]]} />
                </Field>
              ))}
              {!user && (
                <Field data-invalid={Boolean(form.formState.errors.password)}>
                  <FieldLabel htmlFor={`${id}-password`}>
                    Contraseña inicial <span className="text-destructive">*</span>
                  </FieldLabel>
                  <div className="users-password">
                    <Input
                      id={`${id}-password`}
                      type={visible ? "text" : "password"}
                      autoComplete="new-password"
                      {...form.register("password")}
                      aria-invalid={Boolean(form.formState.errors.password)}
                      aria-describedby={`${id}-password-hint ${id}-password-error`}
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(!visible)}
                      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <FieldDescription id={`${id}-password-hint`}>Mínimo 12 caracteres.</FieldDescription>
                  <FieldError id={`${id}-password-error`} errors={[form.formState.errors.password]} />
                </Field>
              )}
              <Field data-invalid={Boolean(form.formState.errors.role)}>
                <FieldLabel htmlFor={`${id}-role`}>Rol</FieldLabel>
                <select
                  id={`${id}-role`}
                  className="delivery-select"
                  {...form.register("role")}
                  disabled={own || mutation.isPending}
                  aria-describedby={`${id}-role-hint ${id}-role-error`}
                  aria-invalid={Boolean(form.formState.errors.role)}
                >
                  <option value="regular">Usuario regular</option>
                  <option value="admin">Administrador</option>
                </select>
                <FieldDescription id={`${id}-role-hint`}>
                  {own
                    ? "No puedes cambiar tu propio rol."
                    : "Los administradores gestionan cuentas y catálogos. Cambiar el rol revoca las sesiones de la cuenta."}
                </FieldDescription>
                <FieldError id={`${id}-role-error`} errors={[form.formState.errors.role]} />
              </Field>
            </fieldset>
          </div>
          <div className="bg-surface flex shrink-0 justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : user ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
