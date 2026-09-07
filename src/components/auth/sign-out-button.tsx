"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { signOut } from "@/lib/auth-client"

/**
 * Cierra la sesión: Better Auth revoca la sesión en la base de datos (el token
 * deja de ser válido) y borra la cookie; luego se redirige al login.
 */
export function SignOutButton() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const handleSignOut = async () => {
    setIsPending(true)
    try {
      await signOut()
    } finally {
      // Aunque la petición falle, se limpia el estado del cliente y se envía al
      // login: sin cookie válida no hay acceso a las vistas protegidas.
      router.replace("/login")
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="text-ink-muted focus-visible:ring-brand/60 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
    >
      <LogOut className="size-3.5" />
      {isPending ? "Cerrando…" : "Cerrar sesión"}
    </button>
  )
}
