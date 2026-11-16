import assert from "node:assert/strict"
import { test } from "node:test"
import { actions, can, resources } from "../src/lib/permissions"
import { authorizeUser } from "../src/lib/authorization"
import { AppError } from "../src/lib/api-error"

const operational = new Set(["deliveries", "supplies", "activities", "evidence"])
const readable = new Set(["neighborhood-associations", "strategic-actions", "summary", "search"])

test("matriz completa: administrador, roles normales y valores desconocidos", () => {
  for (const resource of resources) {
    for (const action of actions) {
      assert.equal(can("admin", resource, action), true)
      for (const role of ["regular", "user", "", null, undefined]) {
        assert.equal(
          can(role, resource, action),
          operational.has(resource) || (readable.has(resource) && action === "read"),
          `${role}: ${resource}.${action}`,
        )
      }
      for (const role of ["unknown", "ADMIN", "admin,user", "viewer"]) {
        assert.equal(can(role, resource, action), false)
      }
    }
  }
})

test("sin sesión devuelve 401; sin permisos devuelve 403", () => {
  assert.throws(
    () => authorizeUser(null, "deliveries", "read"),
    (e: unknown) => e instanceof AppError && e.status === 401,
  )
  assert.throws(
    () => authorizeUser({ role: "user" }, "strategic-actions", "update"),
    (e: unknown) => e instanceof AppError && e.status === 403,
  )
})

test("no restringe por autor y aplica el rol de cada petición", () => {
  const user = { id: "operator", role: "admin" }
  assert.equal(authorizeUser(user, "neighborhood-associations", "delete"), user)
  user.role = "user"
  assert.throws(
    () => authorizeUser(user, "neighborhood-associations", "delete"),
    (e: unknown) => e instanceof AppError && e.status === 403,
  )
  for (const resource of ["deliveries", "supplies"] as const) {
    for (const action of actions) assert.equal(authorizeUser(user, resource, action), user)
  }
})
