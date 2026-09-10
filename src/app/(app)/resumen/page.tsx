import type { Metadata } from "next"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata: Metadata = { title: "Resumen · DGRD Ñuñoa" }

export default function ResumenPage() {
  return <ModulePlaceholder crumbs={[{ label: "General" }, { label: "Resumen", current: true }]} title="Resumen" />
}
