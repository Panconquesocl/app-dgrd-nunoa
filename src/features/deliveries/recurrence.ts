/** Seis meses calendario respecto de hoy en Chile, con ambos días incluidos. */
export function deliveryRecurrenceWindow(now = new Date()) {
  const through = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  const [year, month, day] = through.split("-").map(Number)
  const start = new Date(Date.UTC(year, month - 7, 1))
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
  start.setUTCDate(Math.min(day, lastDay))
  const end = new Date(`${through}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  return { from: start.toISOString().slice(0, 10), through, start, end }
}

export function deliveryRecurrenceMessage(count: number) {
  return count === 1
    ? "Este RUT tiene 1 entrega anterior en los últimos 6 meses. Puedes registrar esta entrega igualmente."
    : `Este RUT tiene ${count} entregas anteriores en los últimos 6 meses. Puedes registrar esta entrega igualmente.`
}
