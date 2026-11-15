"use client"
import { useId, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Info, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field"
import { userPasswordSchema, type UserItem } from "../schemas"
import { useResetUserPassword } from "../queries"
import "./users.css"
export function UserPasswordDialog({ user, meId, onClose }: { user: UserItem; meId: string; onClose: () => void }) {
  const id = useId()
  const form = useForm<{ password: string }>({
    resolver: zodResolver(userPasswordSchema),
    defaultValues: { password: "" },
  })
  const mutation = useResetUserPassword(user.id)
  const [visible, setVisible] = useState(false)
  const save = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values.password)
      form.reset()
      toast.success("Contraseña restablecida. Las sesiones fueron revocadas.")
      onClose()
      if (user.id === meId) window.location.assign("/login")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo restablecer la contraseña.")
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
        className="gap-0 overflow-hidden p-0 sm:max-w-[460px]"
        onEscapeKeyDown={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
      >
        <DialogHeader className="border-b px-6 py-5 pr-12 text-left">
          <DialogTitle className="flex items-center gap-3">
            <KeyRound size={19} />
            Restablecer contraseña
          </DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} noValidate>
          <fieldset disabled={mutation.isPending} className="space-y-4 px-6 py-5">
            <p className="users-notice">
              <Info size={17} />
              <span>
                Se cerrarán todas las sesiones de esta cuenta.{" "}
                {user.id === meId
                  ? "Tendrás que iniciar sesión con la nueva contraseña."
                  : "Comunica la nueva contraseña de forma segura."}
              </span>
            </p>
            <Field data-invalid={Boolean(form.formState.errors.password)}>
              <FieldLabel htmlFor={id}>
                Nueva contraseña <span className="text-destructive">*</span>
              </FieldLabel>
              <div className="users-password">
                <Input
                  id={id}
                  autoFocus
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  {...form.register("password")}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby={`${id}-hint ${id}-error`}
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <FieldDescription id={`${id}-hint`}>Mínimo 12 caracteres.</FieldDescription>
              <FieldError id={`${id}-error`} errors={[form.formState.errors.password]} />
            </Field>
          </fieldset>
          <div className="bg-surface flex justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : "Restablecer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
