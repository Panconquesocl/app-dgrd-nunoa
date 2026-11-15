const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const timestamp = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})
export function formatActivityRecordDate(value: string) {
  const parts = Object.fromEntries(timestamp.formatToParts(new Date(value)).map((part) => [part.type, part.value]))
  return `${Number(parts.day)} ${months[Number(parts.month) - 1]} ${parts.year}, ${parts.hour}:${parts.minute}`
}
const calendarDate = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
})
export const formatActivityDateLong = (value: string) => calendarDate.format(new Date(value))
