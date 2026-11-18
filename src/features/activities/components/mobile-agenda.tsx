import Link from "next/link"
import { Activity, CalendarDays, MapPin } from "lucide-react"
import type { ActivityItem } from "../schemas"
import { MONTH_NAMES } from "../timeline"
import { formatDate } from "@/lib/format"
export function MobileAgenda({ activities, year }: { activities: ActivityItem[]; year: number }) {
  if (!activities.length)
    return (
      <div className="delivery-empty">
        <Activity size={28} aria-hidden="true" />
        <h2>Sin actividades en {year}</h2>
        <p>Las actividades registradas aparecerán aquí, ordenadas por fecha.</p>
      </div>
    )
  return (
    <div className="mobile-agenda">
      {MONTH_NAMES.map((month, index) => {
        const items = activities
          .filter((item) => Number(item.date.slice(5, 7)) === index + 1)
          .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
        return !items.length ? null : (
          <section key={month} aria-label={`${month} ${year}`}>
            <h2 className="mobile-agenda-month">
              {month}
              <span className="delivery-count">{items.length}</span>
            </h2>
            {items.map((item) => (
              <article key={item.id} className="mobile-agenda-card">
                <p className="mobile-agenda-date">
                  <CalendarDays size={15} aria-hidden="true" />
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                </p>
                <h3>{item.objective}</h3>
                <p className="mobile-agenda-location">
                  <MapPin size={14} aria-hidden="true" />
                  <span>{item.location}</span>
                </p>
                <div className="mobile-agenda-actions">
                  <Link href={`/plan/actividades/${item.id}`}>Ver actividad →</Link>
                  <Link href={`/plan/acciones/${item.action.id}`}>Acción N°{item.action.number}</Link>
                </div>
              </article>
            ))}
          </section>
        )
      })}
    </div>
  )
}
