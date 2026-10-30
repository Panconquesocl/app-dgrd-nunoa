import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"
import { AppError } from "../src/lib/api-error"

let user: { id: string; role: string } | null = null
mock.module("next/headers", { namedExports: { headers: async () => new Headers() } })
mock.module(pathToFileURL(resolve("src/lib/auth.ts")).href, {
  namedExports: { auth: { api: { getSession: async () => (user ? { user } : null) } } },
})

test("requirePermission consulta sesión y vuelve a evaluar un cambio de rol", async () => {
  const { requirePermission } = await import("../src/lib/session")
  await assert.rejects(
    requirePermission("deliveries", "read"),
    (e: unknown) => e instanceof AppError && e.status === 401,
  )
  user = { id: "operator", role: "admin" }
  assert.equal((await requirePermission("strategic-actions", "update")).id, "operator")
  user = { ...user, role: "user" }
  await assert.rejects(
    requirePermission("strategic-actions", "update"),
    (e: unknown) => e instanceof AppError && e.status === 403,
  )
  assert.equal((await requirePermission("deliveries", "delete")).id, "operator")
})
