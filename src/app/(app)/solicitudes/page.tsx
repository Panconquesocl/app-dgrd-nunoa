import type { Metadata } from "next"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata: Metadata = { title: "Solicitudes · DGRD Ñuñoa" }

export default function SolicitudesPage() {
  return (
    <ModulePlaceholder
      crumbs={[{ label: "Emergencias" }, { label: "Solicitudes", current: true }]}
      title="Solicitudes"
    />
  )
}
