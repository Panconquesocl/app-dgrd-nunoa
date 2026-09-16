"use client"

import { useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { crearSolicitud, editarSolicitud } from "@/server/solicitudes/actions"

type EventoOpcion = {
  id: string
  folio: string
  sector: string
}

type SolicitudInicial = {
  id: string
  channel: string
  response: string | null
  eventId: string | null
  updatedAt: string
}

type Props = {
  eventos: EventoOpcion[]
  solicitud?: SolicitudInicial
}

export function SolicitudForm({ eventos, solicitud }: Props) {
  const router = useRouter()
  const enviando = useRef(false)

  const [medio, setMedio] = useState(solicitud?.channel ?? "")
  const [respuesta, setRespuesta] = useState(solicitud?.response ?? "")
  const [eventoId, setEventoId] = useState(solicitud?.eventId ?? "")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  const cancelarHref = solicitud ? `/solicitudes/${solicitud.id}` : "/solicitudes"

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (enviando.current) return

    setError("")

    if (!medio.trim()) {
      setError("Debes indicar el medio o fuente.")
      return
    }

    const formData = new FormData()
    formData.set("medio", medio)
    formData.set("respuesta", respuesta)
    formData.set("eventoId", eventoId)

    enviando.current = true
    setGuardando(true)

    try {
      const resultado = solicitud
        ? await editarSolicitud(solicitud.id, solicitud.updatedAt, formData)
        : await crearSolicitud(formData)

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      router.push(`/solicitudes/${resultado.id}`)
      router.refresh()
    } catch {
      setError("No se pudo confirmar el resultado. Revisa el listado antes de volver a enviar.")
    } finally {
      enviando.current = false
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-6">
      <fieldset disabled={guardando} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="medio">Medio/fuente *</Label>
          <Input
            id="medio"
            name="medio"
            value={medio}
            onChange={(event) => setMedio(event.target.value)}
            placeholder="Por ejemplo: teléfono, correo o presencial"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="respuesta">Respuesta (opcional)</Label>
          <textarea
            id="respuesta"
            name="respuesta"
            value={respuesta}
            onChange={(event) => setRespuesta(event.target.value)}
            rows={5}
            className="border-input bg-background w-full rounded-md border p-3"
            placeholder="Describe la respuesta o gestión realizada."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventoId">Evento asociado (opcional)</Label>
          <select
            id="eventoId"
            name="eventoId"
            value={eventoId}
            onChange={(event) => setEventoId(event.target.value)}
            className="border-input bg-background w-full rounded-md border p-2"
            aria-describedby="evento-ayuda"
          >
            <option value="">Sin evento asociado</option>
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.folio} — {evento.sector}
              </option>
            ))}
          </select>

          <p id="evento-ayuda" className="text-muted-foreground text-sm">
            {eventos.length === 0
              ? "No hay eventos disponibles. Puedes guardar sin asociar uno."
              : "Selecciona «Sin evento asociado» para dejar la solicitud sin evento."}
          </p>
        </div>
      </fieldset>

      {!solicitud && (
        <p className="text-muted-foreground text-sm">El folio, la fecha y el usuario se registran automáticamente.</p>
      )}

      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : solicitud ? "Guardar cambios" : "Registrar solicitud"}
        </Button>

        <Button type="button" variant="outline" disabled={guardando} onClick={() => router.push(cancelarHref)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
