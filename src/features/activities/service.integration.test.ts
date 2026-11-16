import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import { deleteStrategicAction, updateStrategicAction } from "@/features/strategic-actions/service"
import { activitySchema } from "./schemas"
import { createActivity, deleteActivity, getActivity, getSchedule, updateActivity } from "./service"

test("campos obligatorios y fechas calendario válidas", () => {
  const base = {
    actionId: "cm12345678901234567890123",
    date: "2026-02-28",
    location: " Dirección ",
    objective: " Objetivo ",
    participants: " Vecinos ",
  }
  assert.equal(activitySchema.parse(base).location, "Dirección")
  for (const field of ["actionId", "date", "location", "objective", "participants"])
    assert.equal(activitySchema.safeParse({ ...base, [field]: " " }).success, false)
  assert.equal(activitySchema.safeParse({ ...base, date: "2026-02-30" }).success, false)
  assert.equal(activitySchema.safeParse({ ...base, date: "2026-02-28T12:00:00Z" }).success, false)
})
test(
  "actividades dentro del periodo, reasignación, concurrencia y conservación de la acción",
  { skip: process.env.RUN_ACTIVITIES_INTEGRATION !== "1" },
  async () => {
    const userId = `activities-${randomUUID()}`
    const otherId = `other-${randomUUID()}`
    const status = (code: number) => (error: unknown) => error instanceof AppError && error.status === code
    for (const id of [userId, otherId])
      await prisma.user.create({ data: { id, name: "Prueba", email: `${id}@example.invalid` } })
    try {
      const number = Math.floor(Math.random() * 1000000000) + 1
      const base = {
        number,
        year: 2026,
        title: userId,
        topics: "Prueba",
        implementation: "Prueba",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-31"),
        createdBy: userId,
      }
      const action = await prisma.strategicAction.create({ data: base })
      const second = await prisma.strategicAction.create({
        data: { ...base, number: number + 1, startDate: new Date("2026-04-01"), endDate: new Date("2026-04-30") },
      })
      const input = {
        actionId: action.id,
        date: "2026-03-01",
        location: "Sede",
        objective: "Taller",
        participants: "Vecinos",
      }
      const first = await createActivity(input, otherId)
      await createActivity({ ...input, date: "2026-03-31" }, userId)
      for (const date of ["2026-02-28", "2026-04-01"])
        await assert.rejects(createActivity({ ...input, date }, userId), status(400))
      await assert.rejects(updateActivity(first.id, { ...input, actionId: second.id }, userId), status(400))
      await assert.rejects(updateStrategicAction(action.id, { startDate: new Date("2026-03-02") }, userId), status(409))
      await assert.rejects(updateStrategicAction(action.id, { endDate: new Date("2026-03-30") }, userId), status(409))
      await updateActivity(
        first.id,
        {
          ...input,
          actionId: second.id,
          date: "2026-04-01",
          objective: "Actualizada por otro usuario",
        },
        userId,
      )
      assert.equal((await getActivity(first.id)).creator.name, "Prueba")
      assert.equal((await getActivity(first.id)).actionId, second.id)
      assert.equal(
        (await getSchedule()).activities.some((row) => row.id === first.id),
        true,
      )
      await assert.rejects(deleteStrategicAction(second.id, userId), status(409))
      // Competencia entre acortar periodo y crear en el día que se excluye: solo una puede ganar.
      const results = await Promise.allSettled([
        createActivity({ ...input, actionId: second.id, date: "2026-04-30" }, userId),
        updateStrategicAction(second.id, { endDate: new Date("2026-04-29") }, userId),
      ])
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1)
      const saved = await prisma.strategicAction.findUniqueOrThrow({
        where: { id: second.id },
        include: { activities: true },
      })
      assert.ok(
        saved.activities.every((activity) => activity.date >= saved.startDate && activity.date <= saved.endDate),
      )
      await deleteActivity(first.id, userId)
      assert.ok(await prisma.strategicAction.findUnique({ where: { id: second.id } }))
      await assert.rejects(getActivity(first.id), status(404))
    } finally {
      await prisma.activity.deleteMany({ where: { createdBy: { in: [userId, otherId] } } })
      await prisma.strategicAction.deleteMany({ where: { createdBy: userId } })
      await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } })
      await prisma.auditLog.deleteMany({ where: { actorId: { in: [userId, otherId] } } })
      await prisma.$disconnect()
    }
  },
)
