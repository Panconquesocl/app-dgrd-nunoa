import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { NextRequest } from "next/server"
import { authorizeUser } from "../src/lib/authorization"
import type { Resource, Action } from "../src/lib/permissions"
const file = (path: string) => pathToFileURL(resolve(path)).href
let user: { id: string; role: string } | null = null
let calls: string[] = []
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    requirePermission: async (resource: Resource, action: Action) => authorizeUser(user, resource, action),
  },
})
mock.module(file("src/features/deliveries/service.ts"), {
  namedExports: {
    getDeliveryRecurrence: async (rut: string) => {
      calls.push(rut)
      return { count: 1, from: "2026-05-15", through: "2026-11-15", lastDate: "2026-10-01T00:00:00.000Z" }
    },
  },
})
test("recurrencia autoriza antes de parsear, valida y normaliza el RUT sin caché HTTP", async () => {
  const { GET } = await import(file("src/app/api/deliveries/recurrence/route.ts"))
  for (const role of [null, "regular", "admin", "unknown"]) {
    user = role ? { id: "operator", role } : null
    const allowed = role === "regular" || role === "admin"
    calls = []
    const response = await GET(
      new NextRequest(`http://localhost/api/deliveries/recurrence?rut=${allowed ? "12.345.678-5" : "invalid"}`),
    )
    assert.equal(response.status, role === null ? 401 : allowed ? 200 : 403)
    assert.deepEqual(calls, allowed ? ["12345678-5"] : [])
    if (allowed) assert.equal(response.headers.get("cache-control"), "private, no-store")
  }
  user = { id: "operator", role: "regular" }
  for (const rut of ["", "12345678-9", "bad"]) {
    calls = []
    assert.equal((await GET(new NextRequest(`http://localhost/api/deliveries/recurrence?rut=${rut}`))).status, 400)
    assert.deepEqual(calls, [])
  }
})
