import type { Metadata } from "next"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata: Metadata = { title: "Eventos · DGRD Ñuñoa" }

export default function EventosPage() {
  return <ModulePlaceholder crumbs={[{ label: "Emergencias" }, { label: "Eventos", current: true }]} title="Eventos" />
}
