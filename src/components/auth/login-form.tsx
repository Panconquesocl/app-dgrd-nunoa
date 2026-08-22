"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { GoogleIcon } from "@/components/icons/google"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Vista sin lógica: el submit y el acceso con Google se conectarán a
// Better Auth (email/contraseña + Google) en una iteración posterior.
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="w-full max-w-[372px]">
      <h1 className="text-[22px] font-semibold tracking-tight">Iniciar sesión</h1>
      <p className="text-muted-foreground mt-1.5 text-[13.5px]">Ingresa con tu cuenta institucional.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-secondary-foreground text-[12.5px] font-semibold">
            Correo electrónico
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="nombre@nunoa.cl"
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
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-10 rounded-md pr-10 text-[13.5px]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="text-ink-muted hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-1 my-auto grid size-8 place-items-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-[12.5px] font-medium transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <Button type="submit" className="hover:bg-ink-soft h-10 w-full rounded-md text-[13px] font-semibold">
          Iniciar sesión
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">o</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="bg-surface hover:bg-accent hover:border-ink-muted h-10 w-full rounded-md text-[13px] font-semibold"
      >
        <GoogleIcon className="size-[18px]" />
        Continuar con Google
      </Button>

      <p className="text-muted-foreground mt-6 text-center text-[11.5px] leading-relaxed">
        Acceso exclusivo para personal autorizado de la Municipalidad de Ñuñoa.
      </p>
    </div>
  )
}
