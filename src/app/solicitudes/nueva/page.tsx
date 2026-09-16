import Link from "next/link"
import { SolicitudForm } from "@/components/solicitudes/solicitud-form"
import { listarEventosParaSelector } from "@/server/solicitudes/queries"

export default async function NuevaSolicitudPage() {
  const eventos = await listarEventosParaSelector()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <Link href="/solicitudes" className="text-sm underline underline-offset-4">
        Volver a solicitudes
      </Link>

      <h1 className="text-2xl font-semibold">Nueva solicitud</h1>

      <SolicitudForm eventos={eventos} />
    </main>
  )
}
