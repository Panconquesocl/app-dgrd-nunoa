"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { eliminarSolicitud } from "@/server/solicitudes/actions"

type Props = {
  solicitud: {
    id: string
    folio: string
    updatedAt: string
    evento: { id: string; folio: string } | null
    entrega: { id: string; folio: string } | null
  }
}

export function EliminarSolicitud({ solicitud }: Props) {
  const router = useRouter()
  const enviando = useRef(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState("")

  async function confirmarEliminacion() {
    if (enviando.current) return

    const mensajes = [`¿Quieres eliminar la solicitud ${solicitud.folio}?`, "Esta acción no se puede deshacer."]

    if (solicitud.evento) {
      mensajes.push(`Está asociada al evento ${solicitud.evento.folio}. El evento se conservará.`)
    }

    if (solicitud.entrega) {
      mensajes.push(`También se eliminará la entrega ${solicitud.entrega.folio} y sus ítems.`)
    }

    if (!window.confirm(mensajes.join("\n\n"))) return

    enviando.current = true
    setEliminando(true)
    setError("")

    try {
      const resultado = await eliminarSolicitud(
        solicitud.id,
        solicitud.updatedAt,
        solicitud.evento?.id ?? null,
        solicitud.entrega?.id ?? null,
      )

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      router.push("/solicitudes")
      router.refresh()
    } catch {
      setError("No se pudo confirmar la eliminación. Revisa el listado antes de intentarlo nuevamente.")
    } finally {
      enviando.current = false
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="destructive" disabled={eliminando} onClick={confirmarEliminacion}>
        {eliminando ? "Eliminando…" : "Eliminar solicitud"}
      </Button>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
