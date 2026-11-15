import Link from "next/link"
import { CalendarRange, Target } from "lucide-react"
import "./schedule.css"
export function PlanTabs({ active }: { active: "actions" | "schedule" }) {
  return (
    <nav className="plan-tabs" aria-label="Plan RRD">
      <Link href="/plan/cronograma" aria-current={active === "schedule" ? "page" : undefined}>
        <CalendarRange size={14} />
        Cronograma
      </Link>
      <Link href="/plan/acciones" aria-current={active === "actions" ? "page" : undefined}>
        <Target size={14} />
        Acciones estratégicas
      </Link>
    </nav>
  )
}
