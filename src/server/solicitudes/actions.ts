"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { exigirUsuarioAccion } from "./session"
import { ErrorSolicitud, validarFormulario, validarId, validarVersion } from "./validation"

type ResultadoAccion = { ok: true; id: string } | { ok: false; error: string }

function responderError(error: unknown): ResultadoAccion {
  if (error instanceof ErrorSolicitud) {
    return { ok: false, error: error.message }
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "P2034") {
      return {
        ok: false,
        error: "Hubo un cambio simultáneo. Recarga la página e inténtalo nuevamente.",
      }
    }

    if (error.code === "P2003") {
      return {
        ok: false,
        error: "Un registro relacionado cambió o ya no existe. Recarga la página.",
      }
    }

    if (error.code === "P2025") {
      return {
        ok: false,
        error: "La solicitud ya no existe. Vuelve al listado.",
      }
    }

    if (error.code === "P2002") {
      return {
        ok: false,
        error: "No se pudo asignar un identificador único. Inténtalo nuevamente.",
      }
    }
  }

  console.error("No se pudo completar una operación de solicitudes.")

  return {
    ok: false,
    error: "No se pudo completar la operación. Inténtalo nuevamente.",
  }
}

function actualizarPantallas(id: string) {
  revalidatePath("/solicitudes")
  revalidatePath(`/solicitudes/${id}`)
  revalidatePath(`/solicitudes/${id}/editar`)
}

export async function crearSolicitud(formData: FormData): Promise<ResultadoAccion> {
  let id: string

  try {
    const user = await exigirUsuarioAccion()
    const datos = validarFormulario(formData)

    const solicitud = await prisma.$transaction(async (tx) => {
      if (datos.eventId) {
        const evento = await tx.event.findUnique({
          where: { id: datos.eventId },
          select: { id: true },
        })

        if (!evento) {
          throw new ErrorSolicitud("El evento seleccionado ya no existe.")
        }
      }

      return tx.request.create({
        data: {
          ...datos,
          folio: `SOL-${randomUUID()}`,
          createdBy: user.id,
        },
        select: { id: true },
      })
    })

    id = solicitud.id
  } catch (error) {
    return responderError(error)
  }

  actualizarPantallas(id)
  return { ok: true, id }
}

export async function editarSolicitud(
  solicitudId: string,
  version: string,
  formData: FormData,
): Promise<ResultadoAccion> {
  let id: string

  try {
    await exigirUsuarioAccion()

    id = validarId(solicitudId)
    const versionEsperada = validarVersion(version)
    const datos = validarFormulario(formData)

    await prisma.$transaction(
      async (tx) => {
        const actual = await tx.request.findUnique({
          where: { id },
          select: { updatedAt: true },
        })

        if (!actual) {
          throw new ErrorSolicitud("La solicitud ya no existe.")
        }

        if (actual.updatedAt.toISOString() !== versionEsperada) {
          throw new ErrorSolicitud("La solicitud cambió desde que la abriste. Recarga antes de editar.")
        }

        if (datos.eventId) {
          const evento = await tx.event.findUnique({
            where: { id: datos.eventId },
            select: { id: true },
          })

          if (!evento) {
            throw new ErrorSolicitud("El evento seleccionado ya no existe.")
          }
        }

        await tx.request.update({
          where: { id },
          data: datos,
        })

        // La entrega vinculada hereda el evento de la solicitud.
        await tx.delivery.updateMany({
          where: { requestId: id },
          data: { eventId: datos.eventId },
        })
      },
      { isolationLevel: "Serializable" },
    )
  } catch (error) {
    return responderError(error)
  }

  actualizarPantallas(id)
  return { ok: true, id }
}

export async function eliminarSolicitud(
  solicitudId: string,
  version: string,
  eventoIdEsperado: string | null,
  entregaIdEsperada: string | null,
): Promise<ResultadoAccion> {
  let id: string

  try {
    await exigirUsuarioAccion()

    id = validarId(solicitudId)
    const versionEsperada = validarVersion(version)
    const eventoId = eventoIdEsperado === null ? null : validarId(eventoIdEsperado)
    const entregaId = entregaIdEsperada === null ? null : validarId(entregaIdEsperada)

    await prisma.$transaction(
      async (tx) => {
        const actual = await tx.request.findUnique({
          where: { id },
          select: {
            updatedAt: true,
            eventId: true,
            delivery: {
              select: { id: true },
            },
          },
        })

        if (!actual) {
          throw new ErrorSolicitud("La solicitud ya no existe.")
        }

        const cambio =
          actual.updatedAt.toISOString() !== versionEsperada ||
          actual.eventId !== eventoId ||
          (actual.delivery?.id ?? null) !== entregaId

        if (cambio) {
          throw new ErrorSolicitud("La solicitud o sus asociaciones cambiaron. Recarga y revisa antes de eliminar.")
        }

        // El evento se conserva. Prisma elimina la entrega vinculada
        // en cascada, según el esquema existente.
        await tx.request.delete({
          where: { id },
        })
      },
      { isolationLevel: "Serializable" },
    )
  } catch (error) {
    return responderError(error)
  }

  actualizarPantallas(id)
  return { ok: true, id }
}
