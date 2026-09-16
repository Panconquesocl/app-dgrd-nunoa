import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatearFecha, listarSolicitudes, normalizarFiltro } from "@/server/solicitudes/queries"

type Props = {
  searchParams: Promise<{
    evento?: string | string[]
  }>
}

export default async function SolicitudesPage({ searchParams }: Props) {
  const parametros = await searchParams
  const filtro = normalizarFiltro(parametros.evento)
  const solicitudes = await listarSolicitudes(filtro)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Solicitudes</h1>

        <Button asChild>
          <Link href="/solicitudes/nueva">Nueva solicitud</Link>
        </Button>
      </div>

      <form action="/solicitudes" method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <label htmlFor="filtro-evento" className="block text-sm font-medium">
            Asociación a evento
          </label>

          <select
            key={filtro}
            id="filtro-evento"
            name="evento"
            defaultValue={filtro}
            className="border-input bg-background rounded-md border p-2"
          >
            <option value="todas">Todas</option>
            <option value="con-evento">Con evento asociado</option>
            <option value="sin-evento">Sin evento asociado</option>
          </select>
        </div>

        <Button type="submit" variant="outline">
          Aplicar filtro
        </Button>
      </form>

      <p className="text-muted-foreground text-sm">{solicitudes.length} solicitudes encontradas.</p>

      {solicitudes.length === 0 ? (
        <p className="rounded-md border p-6">No hay solicitudes para el filtro seleccionado.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Listado de solicitudes</caption>

            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-3">
                  Folio
                </th>
                <th scope="col" className="p-3">
                  Medio/fuente
                </th>
                <th scope="col" className="p-3">
                  Respuesta
                </th>
                <th scope="col" className="p-3">
                  Fecha de creación
                </th>
                <th scope="col" className="p-3">
                  Evento asociado
                </th>
                <th scope="col" className="p-3">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {solicitudes.map((solicitud) => (
                <tr key={solicitud.id} className="border-t align-top">
                  <td className="max-w-56 p-3 break-words">{solicitud.folio}</td>

                  <td className="max-w-64 p-3 break-words">{solicitud.channel}</td>

                  <td className="max-w-80 p-3 break-words whitespace-pre-wrap">
                    {solicitud.response || "Sin respuesta"}
                  </td>

                  <td className="p-3">{formatearFecha(solicitud.createdAt)}</td>

                  <td className="p-3">
                    {solicitud.event ? `${solicitud.event.folio} — ${solicitud.event.sector}` : "Sin evento asociado"}
                  </td>

                  <td className="p-3">
                    <Link
                      href={`/solicitudes/${solicitud.id}`}
                      className="underline underline-offset-4"
                      aria-label={`Ver detalle de ${solicitud.folio}`}
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
