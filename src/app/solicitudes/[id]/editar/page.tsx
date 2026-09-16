import Link from "next/link"
import { notFound } from "next/navigation"
import { SolicitudForm } from "@/components/solicitudes/solicitud-form"
import { listarEventosParaSelector, obtenerSolicitud } from "@/server/solicitudes/queries"

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditarSolicitudPage({ params }: Props) {
  const { id } = await params

  const [solicitud, eventos] = await Promise.all([obtenerSolicitud(id), listarEventosParaSelector()])

  if (!solicitud) {
    notFound()
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <Link href={`/solicitudes/${solicitud.id}`} className="text-sm underline underline-offset-4">
        Volver al detalle
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Editar solicitud</h1>
        <p className="text-muted-foreground break-words">{solicitud.folio}</p>
      </div>

      <SolicitudForm
        key={solicitud.updatedAt.toISOString()}
        eventos={eventos}
        solicitud={{
          id: solicitud.id,
          channel: solicitud.channel,
          response: solicitud.response,
          eventId: solicitud.eventId,
          updatedAt: solicitud.updatedAt.toISOString(),
        }}
      />
    </main>
  )
}
