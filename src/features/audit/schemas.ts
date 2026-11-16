import { z } from "zod"

export const AUDIT_RESOURCES = {
  deliveries: "Entregas",
  supplies: "Insumos",
  "neighborhood-associations": "Juntas vecinales",
  requests: "Solicitudes",
  events: "Eventos",
  "strategic-actions": "Acciones estratégicas",
  activities: "Actividades",
  "event-types": "Tipos de evento",
  users: "Usuarios",
} as const
export const AUDIT_ACTIONS = { create: "Creación", update: "Modificación", delete: "Eliminación" } as const
export const auditQuerySchema = z
  .object({
    resource: z
      .enum(Object.keys(AUDIT_RESOURCES) as [keyof typeof AUDIT_RESOURCES, ...(keyof typeof AUDIT_RESOURCES)[]])
      .optional(),
    action: z.enum(["create", "update", "delete"]).optional(),
    actorId: z.string().min(1).max(200).optional(),
    from: z.iso.date("La fecha inicial no es válida.").optional(),
    to: z.iso.date("La fecha final no es válida.").optional(),
    cursor: z.uuid("La página no es válida.").optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ["to"],
    message: "La fecha final no puede ser anterior a la inicial.",
  })
export type AuditQuery = z.infer<typeof auditQuerySchema>
export type AuditEntry = {
  id: string
  createdAt: string
  operationId: string
  actorId: string
  actorName: string
  actorEmail: string
  resource: keyof typeof AUDIT_RESOURCES
  action: keyof typeof AUDIT_ACTIONS
  entityId: string
  entityLabel: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}
export type AuditResponse = { data: AuditEntry[]; nextCursor: string | null }
export type AuditActor = { actorId: string; actorName: string; actorEmail: string }
export const AUDIT_FIELDS: Record<string, string> = {
  folio: "Folio",
  beneficiary: "Beneficiario",
  beneficiaryRut: "RUT",
  neighborhoodAssociationId: "Junta vecinal",
  contact: "Contacto",
  address: "Dirección",
  date: "Fecha",
  requestId: "Solicitud",
  eventId: "Evento",
  createdBy: "Autor original",
  items: "Insumos",
  supplyId: "Insumo",
  quantity: "Cantidad",
  id: "Identificador",
  type: "Nombre del insumo",
  unit: "Unidad",
  number: "Número",
  name: "Nombre",
  active: "Activo",
  channel: "Medio de ingreso",
  description: "Descripción",
  response: "Respuesta",
  status: "Estado",
  typeId: "Tipo de evento",
  sector: "Sector",
  affectedCount: "Personas afectadas",
  institutions: "Instituciones",
  actions: "Acciones realizadas",
  year: "Año",
  title: "Título",
  topics: "Temas",
  implementation: "Implementación",
  startDate: "Inicio",
  endDate: "Término",
  actionId: "Acción estratégica",
  location: "Dirección",
  objective: "Objetivo",
  participants: "Participantes",
  lastName: "Apellido",
  email: "Correo",
  role: "Rol",
  banned: "Cuenta desactivada",
  banExpires: "Desactivada hasta",
  passwordReset: "Contraseña restablecida",
}
