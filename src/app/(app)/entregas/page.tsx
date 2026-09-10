import type { Metadata } from "next"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata: Metadata = { title: "Entregas · DGRD Ñuñoa" }

export default function EntregasPage() {
  return (
    <ModulePlaceholder
      crumbs={[{ label: "Ayudas primera respuesta" }, { label: "Entregas", current: true }]}
      title="Entregas"
    />
  )
}
