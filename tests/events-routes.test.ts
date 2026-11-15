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
mock.module(file("src/features/events/service.ts"), {
  namedExports: Object.fromEntries(
    ["listEvents", "createEvent", "updateEvent", "deleteEvent", "getEvent", "getEventDeletionImpact"].map((name) => [
      name,
      async () => {
        calls++
        return { id: "type" }
      },
    ]),
  ),
})
test("eventos: endpoints rechazan acceso antes de parsear o consultar", async () => {
  const collection = await import(file("src/app/api/events/route.ts"))
  const detail = await import(file("src/app/api/events/[id]/route.ts"))
  const impact = await import(file("src/app/api/events/[id]/deletion-impact/route.ts"))
  for (const [method, handler] of [
    ["GET", collection.GET],
    ["POST", collection.POST],
    ["GET", detail.GET],
    ["GET", impact.GET],
    ["PATCH", detail.PATCH],
    ["DELETE", detail.DELETE],
  ] as const) {
    for (const role of [null, "regular", "unknown", "admin"]) {
      user = role ? { id: "admin", role } : null
      calls = 0
      const request = new Request("http://localhost/api/events", {
        method,
        ...(["POST", "PATCH", "DELETE"].includes(method)
          ? {
              body:
                role === "admin"
                  ? method === "DELETE"
                    ? JSON.stringify({ requestIds: [], deliveryIds: [] })
                    : JSON.stringify({ typeId: "cm12345678901234567890123", date: "2026-11-15", sector: "Prueba" })
                  : "{",
            }
          : {}),
      })
      const response = await handler(request, { params: Promise.resolve({ id: "type" }) })
      assert.equal(
        response.status,
        role === null ? 401 : role !== "admin" ? 403 : method === "POST" ? 201 : method === "DELETE" ? 204 : 200,
      )
      assert.equal(calls, role === "admin" ? 1 : 0)
    }
  }
})
