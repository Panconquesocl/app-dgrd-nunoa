const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  // Las fechas se guardan como medianoche UTC. Formatear en la zona local las
  // correría un día hacia atrás en Chile (UTC-3/-4).
  timeZone: "UTC",
})

/** "2026-01-01T00:00:00.000Z" -> "1 ene 2026" */
export function formatDate(isoDate: string) {
  return dateFormatter.format(new Date(isoDate)).replace(".", "")
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Duración de un período en días, contando ambos extremos: una acción que
 * empieza y termina el mismo día dura 1 día, y del 1 de enero al 31 de
 * diciembre son los 365 del año. Es la convención de planificación, donde una
 * tarea de lunes a viernes son 5 días y no 4.
 */
export function durationInDays(startIso: string, endIso: string) {
  const elapsed = new Date(endIso).getTime() - new Date(startIso).getTime()
  return Math.round(elapsed / MS_PER_DAY) + 1
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
  // A diferencia de las fechas de calendario, createdAt/updatedAt son instantes
  // reales: se muestran en la hora de Chile.
  timeZone: "America/Santiago",
})

/** Instante (timestamp) en hora de Chile: "16 sept 2026, 13:56" */
export function formatDateTime(isoDate: string) {
  return dateTimeFormatter.format(new Date(isoDate))
}
