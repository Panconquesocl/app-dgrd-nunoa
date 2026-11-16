import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { NextRequest } from "next/server"
import { authorizeUser } from "../src/lib/authorization"
import type { Resource, Action } from "../src/lib/permissions"
const file = (value: string) => pathToFileURL(resolve(value)).href
let user: { id: string; role: string } | null = null
let calls: unknown[][] = []
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    requirePermission: async (resource: Resource, action: Action) => authorizeUser(user, resource, action),
  },
})
mock.module(file("src/features/audit/service.ts"), {
  namedExports: {
    listAudit: async (...args: unknown[]) => {
      calls.push(args)
      return { data: [], nextCursor: null }
    },
    getAuditActors: async () => {
      calls.push([])
      return []
    },
  },
})
mock.module(file("src/features/deliveries/service.ts"), {
  namedExports: {
    getDelivery: async () => ({}),
    deleteDelivery: async (...args: unknown[]) => {
      calls.push(args)
    },
    updateDelivery: async (...args: unknown[]) => {
      calls.push(args)
      return {}
    },
  },
})
test("solo administradores consultan auditoría, con validación posterior al guard", async () => {
  const { GET } = await import(file("src/app/api/audit/route.ts"))
  const actors = await import(file("src/app/api/audit/actors/route.ts"))
  for (const role of [null, "regular", "unknown", "admin"]) {
    user = role ? { id: "real-actor", role } : null
    for (const invoke of [() => GET(new NextRequest("http://localhost/api/audit")), () => actors.GET()]) {
      calls = []
      const response = await invoke()
      assert.equal(response.status, !role ? 401 : role === "admin" ? 200 : 403)
      assert.equal(calls.length, role === "admin" ? 1 : 0)
      if (role === "admin") assert.equal(response.headers.get("cache-control"), "private, no-store")
    }
  }
  for (const query of [
    "resource=invalid",
    "action=invalid",
    "from=2026-11-16&to=2026-11-15",
    "from=2026-02-30",
    "cursor=invalid",
  ]) {
    calls = []
    assert.equal((await GET(new NextRequest(`http://localhost/api/audit?${query}`))).status, 400)
    assert.equal(calls.length, 0)
  }
})
test("la identidad de auditoría en mutaciones viene de sesión, nunca del cuerpo", async () => {
  user = { id: "real-actor", role: "regular" }
  const route = await import(file("src/app/api/deliveries/[id]/route.ts"))
  calls = []
  const response = await route.PATCH(
    new NextRequest("http://localhost/api/deliveries/id", {
      method: "PATCH",
      body: JSON.stringify({ contact: "123", actorId: "forged" }),
    }),
    { params: Promise.resolve({ id: "delivery-id" }) },
  )
  assert.equal(response.status, 200)
  assert.deepEqual(calls, [["delivery-id", { contact: "123" }, "real-actor"]])
})
