import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
const calls: string[] = []
const models = ["delivery", "neighborhoodAssociation", "supply", "strategicAction", "activity", "request", "event"]
const fake = Object.fromEntries(
  models.map((model) => [
    model,
    {
      findMany: async () => {
        calls.push(model)
        return []
      },
    },
  ]),
)
mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, { defaultExport: fake })
test("el servicio no consulta ni devuelve módulos restringidos para usuarios normales", async () => {
  const { searchAll } = await import("../src/features/search/service")
  const regular = await searchAll("Vecina", "regular")
  assert.equal(regular.groups.length, 5)
  assert.ok(!regular.groups.some((group) => group.key === "requests" || group.key === "events"))
  assert.ok(!calls.includes("request") && !calls.includes("event"))
  calls.length = 0
  const admin = await searchAll("Vecina", "admin")
  assert.equal(admin.groups.length, 7)
  assert.ok(calls.includes("request") && calls.includes("event"))
  calls.length = 0
  await assert.rejects(searchAll("Vecina", "unknown"))
  assert.deepEqual(calls, [])
})
