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

/** Días transcurridos entre dos fechas ISO, ambos extremos incluidos. */
export function daysBetween(startIso: string, endIso: string) {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / MS_PER_DAY)
}
