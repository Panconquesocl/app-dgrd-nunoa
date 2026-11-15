import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"
import { authorizeUser } from "../src/lib/authorization"
import type { Resource, Action } from "../src/lib/permissions"
const file = (path: string) => pathToFileURL(resolve(path)).href
let user: { id: string; role: string } | null = null
let calls = 0
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    requirePermission: async (resource: Resource, action: Action) => authorizeUser(user, resource, action),
  },
})
mock.module(file("src/features/activities/service.ts"), {
  namedExports: Object.fromEntries(
    ["createActivity", "getActivity", "updateActivity", "deleteActivity", "getSchedule"].map((name) => [
      name,
      async () => {
        calls++
        return { id: "other-authors-record" }
      },
    ]),
  ),
})
test("actividades y cronograma: ambos roles gestionan cualquier autor; acceso denegado antes de parsear", async () => {
  const collection = await import(file("src/app/api/activities/route.ts"))
  const detail = await import(file("src/app/api/activities/[id]/route.ts"))
  const schedule = await import(file("src/app/api/activities/schedule/route.ts"))
  for (const [method, handler] of [
    ["POST", collection.POST],
    ["GET", detail.GET],
    ["PATCH", detail.PATCH],
    ["DELETE", detail.DELETE],
    ["GET", schedule.GET],
  ] as const) {
    for (const role of [null, "regular", "admin", "unknown"]) {
      user = role ? { id: "operator", role } : null
      calls = 0
      const allowed = role === "regular" || role === "admin"
      const request = new Request("http://localhost/api/activities", {
        method,
        ...(["POST", "PATCH"].includes(method)
          ? {
              body: allowed
                ? JSON.stringify({
                    actionId: "cm12345678901234567890123",
                    date: "2026-11-15",
                    location: "Sede",
                    objective: "Prueba",
                    participants: "Vecinos",
                  })
                : "{",
            }
          : {}),
      })
      const response = await handler(request, { params: Promise.resolve({ id: "other-authors-record" }) })
      assert.equal(
        response.status,
        role === null ? 401 : !allowed ? 403 : method === "POST" ? 201 : method === "DELETE" ? 204 : 200,
      )
      assert.equal(calls, allowed ? 1 : 0)
    }
  }
})
