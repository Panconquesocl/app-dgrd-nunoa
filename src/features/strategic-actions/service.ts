import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import { Prisma } from "@/generated/prisma/client"
import {
  dateOrderError,
  type CreateStrategicActionInput,
  type ListStrategicActionsQuery,
  type UpdateStrategicActionInput,
} from "./schemas"

const listSelect = {
  id: true,
  number: true,
  year: true,
  title: true,
  topics: true,
  implementation: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { activities: true } },
} satisfies Prisma.StrategicActionSelect

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

function duplicateNumberError(year: number, number: number) {
  return new AppError(409, `Ya existe la acción N°${number} para el año ${year}.`)
}

/**
 * Listado filtrable. `availableYears` se calcula sin aplicar el filtro: el
 * selector de año del front debe ofrecer todos los años existentes, no solo los
 * del resultado actual.
 */
export async function listStrategicActions({ q, year }: ListStrategicActionsQuery) {
  const where: Prisma.StrategicActionWhereInput = {
    ...(year !== undefined && { year }),
    ...(q && {
      OR: [{ title: { contains: q, mode: "insensitive" } }, { topics: { contains: q, mode: "insensitive" } }],
    }),
  }

  const [data, years] = await prisma.$transaction([
    prisma.strategicAction.findMany({
      where,
      select: listSelect,
      orderBy: [{ year: "desc" }, { number: "asc" }],
    }),
    prisma.strategicAction.findMany({
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    }),
  ])

  return { data, availableYears: years.map((row) => row.year) }
}

export async function getStrategicAction(id: string) {
  const action = await prisma.strategicAction.findUnique({
    where: { id },
    select: {
      ...listSelect,
      activities: {
        select: {
          id: true,
          date: true,
          objective: true,
          location: true,
          participants: true,
          _count: { select: { evidence: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  })

  if (!action) {
    throw new AppError(404, "La acción estratégica no existe.")
  }

  return action
}

export async function createStrategicAction(input: CreateStrategicActionInput, userId: string) {
  try {
    return await prisma.strategicAction.create({
      data: { ...input, createdBy: userId },
      select: listSelect,
    })
  } catch (error) {
    // Se captura el choque contra el índice único en vez de pre-consultar: un
    // pre-check tiene condición de carrera contra @@unique([year, number]).
    if (isPrismaError(error, "P2002")) {
      throw duplicateNumberError(input.year, input.number)
    }
    throw error
  }
}

export async function updateStrategicAction(id: string, input: UpdateStrategicActionInput) {
  const current = await prisma.strategicAction.findUnique({
    where: { id },
    select: { startDate: true, endDate: true },
  })

  if (!current) {
    throw new AppError(404, "La acción estratégica no existe.")
  }

  // El PATCH es parcial, así que las fechas se comparan sobre la mezcla del
  // registro guardado con el parche, no solo sobre lo que vino en el body.
  const startDate = input.startDate ?? current.startDate
  const endDate = input.endDate ?? current.endDate

  if (endDate < startDate) {
    throw new AppError(400, dateOrderError.message, {
      fieldErrors: { [dateOrderError.path]: [dateOrderError.message] },
    })
  }

  try {
    return await prisma.strategicAction.update({
      where: { id },
      data: input,
      select: listSelect,
    })
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      const { year, number } = await prisma.strategicAction.findUniqueOrThrow({
        where: { id },
        select: { year: true, number: true },
      })
      throw duplicateNumberError(input.year ?? year, input.number ?? number)
    }
    if (isPrismaError(error, "P2025")) {
      throw new AppError(404, "La acción estratégica no existe.")
    }
    throw error
  }
}

function blockedByActivitiesError(activityCount: number) {
  return new AppError(
    409,
    `No se puede eliminar: la acción tiene ${activityCount} ${
      activityCount === 1 ? "actividad vinculada" : "actividades vinculadas"
    }.`,
    { details: { activityCount } },
  )
}

export async function deleteStrategicAction(id: string) {
  // El conteo previo no es la defensa: `Activity.action` usa onDelete: Restrict
  // y la base rechaza el borrado igual. Está para dar el número exacto de
  // actividades en el 409, que es lo que el front necesita para explicarlo.
  const activityCount = await prisma.activity.count({ where: { actionId: id } })

  if (activityCount > 0) {
    throw blockedByActivitiesError(activityCount)
  }

  try {
    await prisma.strategicAction.delete({ where: { id } })
  } catch (error) {
    // Si entre el conteo y el borrado se creó una actividad, la restricción de
    // clave foránea salta acá (P2003). Se traduce al mismo 409 en vez de dejar
    // escapar un 500, para no romper el contrato del front.
    if (isPrismaError(error, "P2003")) {
      const currentCount = await prisma.activity.count({ where: { actionId: id } })
      // Si la actividad culpable ya se borró, el conteo puede volver en cero y
      // el mensaje quedaría absurdo. El piso mantiene la frase coherente.
      throw blockedByActivitiesError(Math.max(currentCount, 1))
    }
    if (isPrismaError(error, "P2025")) {
      throw new AppError(404, "La acción estratégica no existe.")
    }
    throw error
  }
}
