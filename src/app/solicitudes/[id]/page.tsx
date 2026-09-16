import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EliminarSolicitud } from "@/components/solicitudes/eliminar-solicitud"
import { formatearFecha, nombresEstado, obtenerSolicitud } from "@/server/solicitudes/queries"

type Props = {
  params: Promise<{ id: string }>
}

export default async function DetalleSolicitudPage({ params }: Props) {
  const { id } = await params
  const solicitud = await obtenerSolicitud(id)

  if (!solicitud) {
    notFound()
  }

  const datos = [
    { titulo: "Identificador", valor: solicitud.id },
    { titulo: "Folio", valor: solicitud.folio },
    { titulo: "Medio/fuente", valor: solicitud.channel },
    { titulo: "Respuesta", valor: solicitud.response || "Sin respuesta" },
    { titulo: "Estado", valor: nombresEstado[solicitud.status] },
    {
      titulo: "Fecha de creación",
      valor: formatearFecha(solicitud.createdAt),
    },
    {
      titulo: "Última actualización",
      valor: formatearFecha(solicitud.updatedAt),
    },
    {
      titulo: "Registrada por",
      valor: solicitud.creator.name,
    },
    {
      titulo: "Evento asociado",
      valor: solicitud.event ? `${solicitud.event.folio} — ${solicitud.event.sector}` : "Sin evento asociado",
    },
    {
      titulo: "Entrega asociada",
      valor: solicitud.delivery?.folio ?? "Sin entrega asociada",
    },
  ]

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <Link href="/solicitudes" className="text-sm underline underline-offset-4">
        Volver a solicitudes
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Detalle de solicitud</h1>
        <p className="text-muted-foreground break-words">{solicitud.folio}</p>
      </div>

      <dl className="divide-y rounded-md border">
        {datos.map((dato) => (
          <div key={dato.titulo} className="grid gap-2 p-4 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium">{dato.titulo}</dt>
            <dd className="min-w-0 break-words whitespace-pre-wrap">{dato.valor}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        <Button asChild variant="outline">
          <Link href={`/solicitudes/${solicitud.id}/editar`}>Editar solicitud</Link>
        </Button>

        <EliminarSolicitud
          key={[solicitud.updatedAt.toISOString(), solicitud.eventId, solicitud.delivery?.id].join("-")}
          solicitud={{
            id: solicitud.id,
            folio: solicitud.folio,
            updatedAt: solicitud.updatedAt.toISOString(),
            evento: solicitud.event
              ? {
                  id: solicitud.event.id,
                  folio: solicitud.event.folio,
                }
              : null,
            entrega: solicitud.delivery,
          }}
        />
      </div>
    </main>
  )
}
