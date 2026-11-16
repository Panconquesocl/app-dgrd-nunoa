import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { authorizeUser } from "../src/lib/authorization"
import type { Resource, Action } from "../src/lib/permissions"
const file = (path: string) => pathToFileURL(resolve(path)).href
let user: { id: string; role: string } | null = null
let calls: unknown[][] = []
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    requirePermission: async (resource: Resource, action: Action) => authorizeUser(user, resource, action),
  },
})
mock.module(file("src/features/summary/service.ts"), {
  namedExports: {
    getNavigationCounts: async (...args: unknown[]) => {
      calls.push(args)
      return { deliveries: 7 }
    },
  },
})

test("contadores: sesión y permisos antes de consultar, rol de sesión y respuesta privada", async () => {
  const { GET } = await import("../src/app/api/summary/counts/route")
  for (const role of [null, "unknown", "regular", "admin"]) {
    user = role ? { id: "operator", role } : null
    calls = []
    const response = await GET()
    const allowed = role === "regular" || role === "admin"
    assert.equal(response.status, role === null ? 401 : allowed ? 200 : 403)
    assert.deepEqual(calls, allowed ? [[role]] : [])
    if (allowed) {
      assert.equal(response.headers.get("cache-control"), "private, no-store")
      assert.deepEqual(await response.json(), { deliveries: 7 })
    }
  }
})
