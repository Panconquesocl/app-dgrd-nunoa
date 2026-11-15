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
mock.module(file("src/features/event-types/service.ts"), {
  namedExports: Object.fromEntries(
    ["listEventTypes", "createEventType", "updateEventType", "deleteEventType"].map((name) => [
      name,
      async () => {
        calls++
        return { id: "type" }
      },
    ]),
  ),
})
test("tipos de evento: endpoints rechazan acceso antes de parsear o consultar", async () => {
  const collection = await import(file("src/app/api/event-types/route.ts"))
  const detail = await import(file("src/app/api/event-types/[id]/route.ts"))
  for (const [method, handler] of [
    ["GET", collection.GET],
    ["POST", collection.POST],
    ["PATCH", detail.PATCH],
    ["DELETE", detail.DELETE],
  ] as const) {
    for (const role of [null, "regular", "unknown", "admin"]) {
      user = role ? { id: "admin", role } : null
      calls = 0
      const request = new Request("http://localhost/api/event-types", {
        method,
        ...(["POST", "PATCH"].includes(method)
          ? { body: role === "admin" ? JSON.stringify({ name: "Incendio" }) : "{" }
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
