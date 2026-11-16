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
mock.module(file("src/features/search/service.ts"), {
  namedExports: {
    searchAll: async (...args: unknown[]) => {
      calls.push(args)
      return { query: args[0], groups: [] }
    },
  },
})
test("búsqueda global autoriza antes de parsear y usa exclusivamente el rol de la sesión", async () => {
  const { GET } = await import(file("src/app/api/search/route.ts"))
  for (const role of [null, "regular", "admin", "unknown"]) {
    user = role ? { id: "operator", role } : null
    const allowed = role === "regular" || role === "admin"
    calls = []
    const response = await GET(
      new NextRequest(
        `http://localhost/api/search?${new URLSearchParams({ q: allowed ? " Vecina " : "", role: "admin" })}`,
      ),
    )
    assert.equal(response.status, role === null ? 401 : allowed ? 200 : 403)
    assert.deepEqual(calls, allowed ? [["Vecina", role]] : [])
    if (allowed) assert.equal(response.headers.get("cache-control"), "private, no-store")
  }
  user = { id: "operator", role: "regular" }
  for (const q of ["", "a", " ", "a".repeat(201)]) {
    calls = []
    assert.equal((await GET(new NextRequest(`http://localhost/api/search?${new URLSearchParams({ q })}`))).status, 400)
    assert.deepEqual(calls, [])
  }
})
