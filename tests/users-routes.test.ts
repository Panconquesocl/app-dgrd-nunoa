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
mock.module(file("src/features/users/service.ts"), {
  namedExports: Object.fromEntries(
    ["createUser", "listUsers", "updateUser", "deleteUser", "resetUserPassword", "setUserActive"].map((name) => [
      name,
      async () => {
        calls++
        return { id: "target" }
      },
    ]),
  ),
})
test("usuarios: rutas administrativas rechazan acceso antes de leer o parsear datos", async () => {
  const collection = await import(file("src/app/api/users/route.ts"))
  const detail = await import(file("src/app/api/users/[id]/route.ts"))
  const password = await import(file("src/app/api/users/[id]/password/route.ts"))
  const status = await import(file("src/app/api/users/[id]/status/route.ts"))
  const profile = { name: "Ana", lastName: "Pérez", role: "regular" }
  for (const [method, handler, body] of [
    ["GET", collection.GET, null],
    ["POST", collection.POST, { ...profile, email: "ana@nunoa.cl", password: "testing-password-2026" }],
    ["PATCH", detail.PATCH, profile],
    ["DELETE", detail.DELETE, null],
    ["POST", password.POST, { password: "testing-password-2026" }],
    ["PATCH", status.PATCH, { active: false }],
  ] as const) {
    for (const role of [null, "regular", "admin", "unknown"]) {
      user = role ? { id: "operator", role } : null
      calls = 0
      const request = new Request("http://localhost/api/users", {
        method,
        ...(body ? { body: role === "admin" ? JSON.stringify(body) : "{" } : {}),
      })
      const response = await handler(request, { params: Promise.resolve({ id: "target" }) })
      assert.equal(
        response.status,
        role === null
          ? 401
          : role !== "admin"
            ? 403
            : method === "DELETE" || handler === password.POST
              ? 204
              : handler === collection.POST
                ? 201
                : 200,
      )
      assert.equal(calls, role === "admin" ? 1 : 0)
    }
  }
  user = { id: "operator", role: "admin" }
  calls = 0
  const response = await detail.PATCH(
    new Request("http://localhost/api/users", {
      method: "PATCH",
      body: JSON.stringify({ ...profile, email: "changed@nunoa.cl" }),
    }),
    { params: Promise.resolve({ id: "target" }) },
  )
  assert.equal(response.status, 400)
  assert.equal(calls, 0)
})
