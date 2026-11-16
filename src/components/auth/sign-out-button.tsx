"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { signOut } from "@/lib/auth-client"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { clearSessionCache } from "@/lib/session-cache"

/**
 * Cierra la sesión: Better Auth revoca la sesión en la base de datos (el token
 * deja de ser válido) y borra la cookie; luego se redirige al login.
 */
export function SignOutButton() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const handleSignOut = async () => {
    setIsPending(true)
    try {
      const result = await signOut()
      if (result.error) throw new Error("No se pudo cerrar la sesión.")
      await clearSessionCache(queryClient)
      router.replace("/login")
      router.refresh()
    } catch {
      toast.error("No se pudo cerrar la sesión. Inténtalo nuevamente.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      aria-label={isPending ? "Cerrando sesión" : "Cerrar sesión"}
      title={isPending ? "Cerrando sesión" : "Cerrar sesión"}
      className="text-destructive hover:bg-destructive/10 focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
    >
      <LogOut className="size-[18px] shrink-0" aria-hidden="true" />
      <span>{isPending ? "Cerrando…" : "Cerrar sesión"}</span>
    </button>
  )
}
