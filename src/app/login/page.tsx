import type { Metadata } from "next"
import Image from "next/image"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Iniciar sesión · DGRD Ñuñoa",
  description: "Acceso al sistema interno de la Dirección de Gestión de Riesgo y Desastres de Ñuñoa.",
}

/**
 * Sólo se acepta una ruta interna como destino tras el login; así un enlace
 * manipulado (`?redirectTo=https://…`) no puede convertir el login en un
 * redirector abierto.
 */
function safeRedirect(target: string | undefined) {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/login")) {
    return "/"
  }
  return target
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  // Si ya hay una sesión válida en la base de datos, no tiene sentido el login.
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) {
    redirect("/")
  }

  const { redirectTo } = await searchParams

  return (
    <div className="bg-surface grid min-h-svh flex-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Panel institucional */}
      <section className="bg-ink relative hidden flex-col justify-between overflow-hidden px-13 py-11 text-white lg:flex">
        <Image
          src="/logo-mark-yellow.svg"
          alt=""
          width={360}
          height={360}
          unoptimized
          aria-hidden="true"
          className="pointer-events-none absolute -top-15 -right-18 w-[360px] opacity-[0.06]"
        />
        <Image
          src="/logo-mark-yellow.svg"
          alt=""
          width={420}
          height={420}
          unoptimized
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-30 -left-28 w-[420px] opacity-[0.04]"
        />

        <Image
          src="/logo-full-white.svg"
          alt="Municipalidad de Ñuñoa"
          width={107}
          height={46}
          unoptimized
          priority
          className="relative h-[46px] w-auto"
        />

        <div className="relative max-w-[440px]">
          <div className="bg-brand/15 text-brand mb-5 inline-flex items-center gap-2 rounded-full px-3 py-[5px] text-xs font-semibold">
            <ShieldCheck className="size-3.5" />
            Sistema interno · Acceso restringido
          </div>
          <h2 className="text-[30px] leading-[1.18] font-semibold tracking-tight">
            Dirección de Gestión de Riesgo y Desastres
          </h2>
          <p className="text-ink-muted mt-3.5 text-[15px] leading-relaxed">
            Registro y seguimiento de solicitudes, eventos de emergencia, entregas de insumos y el Plan de Reducción del
            Riesgo de Desastres de la comuna.
          </p>
        </div>
      </section>

      {/* Panel de formulario */}
      <section className="flex items-center justify-center px-6 py-10 sm:px-8">
        <LoginForm redirectTo={safeRedirect(redirectTo)} />
      </section>
    </div>
  )
}
