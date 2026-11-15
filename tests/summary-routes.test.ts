import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { NextRequest } from "next/server"
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
    getSummary: async (...args: unknown[]) => {
      calls.push(args)
      return { year: args[0] }
    },
  },
})
mock.module("next/navigation", {
  namedExports: {
    redirect: (path: string) => {
      throw new Error(`redirect:${path}`)
    },
  },
})
test("resumen: autoriza antes de validar y transmite el rol del servidor", async () => {
  const { GET } = await import(file("src/app/api/summary/route.ts"))
  for (const role of [null, "regular", "admin", "unknown"]) {
    user = role ? { id: "operator", role } : null
    calls = []
    const allowed = role === "regular" || role === "admin"
    const response = await GET(new NextRequest(`http://localhost/api/summary?year=${allowed ? 2026 : "invalid"}`))
    assert.equal(response.status, role === null ? 401 : allowed ? 200 : 403)
    assert.deepEqual(calls, allowed ? [[2026, role]] : [])
  }
  user = { id: "operator", role: "regular" }
  for (const year of ["2026.5", "2201", "1900 OR 1=1", ""]) {
    calls = []
    const response = await GET(new NextRequest(`http://localhost/api/summary?${new URLSearchParams({ year })}`))
    assert.equal(response.status, 400)
    assert.deepEqual(calls, [])
  }
})
test("la página inicial redirige al resumen", async () => {
  const { default: Home } = await import(file("src/app/(app)/page.tsx"))
  assert.throws(() => Home(), /redirect:\/resumen/)
})
