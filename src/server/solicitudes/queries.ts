import prisma from "@/lib/prisma"
import { exigirUsuarioPagina } from "./session"

export type FiltroSolicitudes = "todas" | "con-evento" | "sin-evento"

export function normalizarFiltro(value: unknown): FiltroSolicitudes {
  if (value === "con-evento" || value === "sin-evento") {
    return value
  }

  return "todas"
}

export function formatearFecha(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(date)
}

export const nombresEstado = {
  pending: "Pendiente",
  attended: "Atendida",
  cancelled: "Anulada",
}

export async function listarSolicitudes(filtro: FiltroSolicitudes) {
  await exigirUsuarioPagina()

  const where = filtro === "con-evento" ? { eventId: { not: null } } : filtro === "sin-evento" ? { eventId: null } : {}

  return prisma.request.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      folio: true,
      channel: true,
      response: true,
      createdAt: true,
      event: {
        select: {
          id: true,
          folio: true,
          sector: true,
        },
      },
    },
  })
}

export async function obtenerSolicitud(id: string) {
  await exigirUsuarioPagina()

  return prisma.request.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          name: true,
        },
      },
      event: {
        select: {
          id: true,
          folio: true,
          sector: true,
        },
      },
      delivery: {
        select: {
          id: true,
          folio: true,
        },
      },
    },
  })
}

export async function listarEventosParaSelector() {
  await exigirUsuarioPagina()

  return prisma.event.findMany({
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: {
      id: true,
      folio: true,
      sector: true,
    },
  })
}
