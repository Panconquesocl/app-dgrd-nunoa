"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth-client"

// Mensaje único para cualquier fallo de credenciales: no se revela si el error
// está en el correo o en la contraseña (evita enumerar cuentas).
const CREDENTIALS_ERROR = "Correo o contraseña incorrectos."
const RATE_LIMIT_ERROR = "Demasiados intentos fallidos. Espera un momento y vuelve a intentarlo."
const UNEXPECTED_ERROR = "No pudimos iniciar sesión. Inténtalo nuevamente en unos segundos."

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    const { error: signInError } = await signIn.email({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setIsPending(false)
      if (signInError.status === 429) {
        setError(RATE_LIMIT_ERROR)
      } else if (signInError.status && signInError.status >= 500) {
        setError(UNEXPECTED_ERROR)
      } else {
        setError(CREDENTIALS_ERROR)
      }
      return
    }

    router.replace(redirectTo)
    router.refresh()
  }

  return (
    <div className="w-full max-w-[372px]">
      <h1 className="text-[22px] font-semibold tracking-tight">Iniciar sesión</h1>
      <p className="text-muted-foreground mt-1.5 text-[13.5px]">Ingresa con tu cuenta institucional.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-secondary-foreground text-[12.5px] font-semibold">
            Correo electrónico
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            autoFocus
            placeholder="nombre@nunoa.cl"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
            aria-invalid={error !== null}
            className="h-10 rounded-md text-[13.5px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-secondary-foreground text-[12.5px] font-semibold">
            Contraseña
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
              aria-invalid={error !== null}
              className="h-10 rounded-md pr-10 text-[13.5px]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="text-ink-muted hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-1 my-auto grid size-8 place-items-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div role="alert" aria-live="polite">
          {error !== null && (
            <p className="text-destructive bg-destructive/8 border-destructive/25 flex items-start gap-2 rounded-md border px-3 py-2 text-[12.5px] leading-snug">
              <AlertCircle className="mt-px size-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="hover:bg-ink-soft h-10 w-full rounded-md text-[13px] font-semibold"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-[11.5px] leading-relaxed">
        Acceso exclusivo para personal autorizado de la Municipalidad de Ñuñoa.
        <br />
        ¿Problemas para ingresar? Escribe al administrador del sistema.
      </p>
    </div>
  )
}
