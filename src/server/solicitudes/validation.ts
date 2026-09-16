export class ErrorSolicitud extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ErrorSolicitud"
  }
}

export function validarId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ErrorSolicitud("El identificador no es válido.")
  }

  return value.trim()
}

export function validarVersion(value: unknown): string {
  if (typeof value !== "string") {
    throw new ErrorSolicitud("La versión de la solicitud no es válida.")
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new ErrorSolicitud("La versión de la solicitud no es válida.")
  }

  return date.toISOString()
}

export function validarFormulario(formData: FormData) {
  const medio = formData.get("medio")
  const respuesta = formData.get("respuesta")
  const eventoId = formData.get("eventoId")

  if (typeof medio !== "string" || !medio.trim()) {
    throw new ErrorSolicitud("Debes indicar el medio o fuente.")
  }

  if (typeof respuesta !== "string") {
    throw new ErrorSolicitud("La respuesta debe ser texto.")
  }

  if (typeof eventoId !== "string") {
    throw new ErrorSolicitud("La selección del evento no es válida.")
  }

  return {
    channel: medio.trim(),
    response: respuesta.trim() || null,
    eventId: eventoId.trim() || null,
  }
}
