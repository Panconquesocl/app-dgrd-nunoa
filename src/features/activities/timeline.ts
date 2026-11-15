import type { ActivityItem } from "./schemas"
export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]
export function yearPosition(date: string, year: number) {
  const start = Date.UTC(year, 0, 1)
  return Math.max(0, Math.min(100, ((new Date(date).getTime() - start) / (Date.UTC(year + 1, 0, 1) - start)) * 100))
}
export function activityClusters(activities: ActivityItem[], year: number) {
  const clusters: { position: number; items: ActivityItem[] }[] = []
  for (const activity of [...activities]
    .filter((item) => Number(item.date.slice(0, 4)) === year)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    const position = yearPosition(activity.date, year)
    const previous = clusters.at(-1)
    if (previous && position - previous.position <= 2.4) previous.items.push(activity)
    else clusters.push({ position, items: [activity] })
  }
  return clusters
}
