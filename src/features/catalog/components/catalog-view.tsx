"use client"
import Link from "next/link"
import { ArrowRight, Box, Siren, Users } from "lucide-react"
import { usePermission } from "@/providers/permissions"
import "@/features/deliveries/components/deliveries.css"
import "@/features/event-types/components/configuration.css"

export function CatalogView() {
  const canReadSupplies = usePermission("supplies", "read")
  const canReadAssociations = usePermission("neighborhood-associations", "read")
  const canReadTypes = usePermission("event-types", "read")
  const canManageAssociations = usePermission("neighborhood-associations", "update")
  return (
    <div className="configuration deliveries delivery-page">
      <div className="delivery-page-head">
        <div>
          <span className="configuration-eyebrow">Administración</span>
          <h1>Catálogo</h1>
          <p>Accede a los catálogos del sistema.</p>
        </div>
      </div>
      <section className="configuration-catalogs" aria-label="Catálogos">
        {canReadSupplies && (
          <Link href="/insumos" className="configuration-catalog">
            <span className="configuration-icon">
              <Box size={22} aria-hidden="true" />
            </span>
            <span className="configuration-catalog-main">
              <strong>Insumos</strong>
              <span>Gestiona los insumos y sus unidades de medida.</span>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        )}
        {canReadAssociations && (
          <Link href="/juntas-vecinales" className="configuration-catalog">
            <span className="configuration-icon">
              <Users size={22} aria-hidden="true" />
            </span>
            <span className="configuration-catalog-main">
              <strong>Juntas vecinales</strong>
              <span>
                {canManageAssociations
                  ? "Gestiona las juntas vecinales y consulta sus entregas."
                  : "Consulta las juntas vecinales y sus entregas."}
              </span>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        )}
        {canReadTypes && (
          <Link href="/tipos-evento" className="configuration-catalog">
            <span className="configuration-icon">
              <Siren size={22} aria-hidden="true" />
            </span>
            <span className="configuration-catalog-main">
              <strong>Tipos de evento</strong>
              <span>Gestiona la clasificación de los eventos.</span>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        )}
      </section>
    </div>
  )
}
