import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { QueryClient } from "@tanstack/react-query"
import { safeLoginRedirect } from "../src/lib/auth-redirect"
import { clearSessionCache } from "../src/lib/session-cache"

const file = (path: string) => pathToFileURL(resolve(path)).href
let authenticated = false
let sessionChecks = 0
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    getSession: async () => {
      sessionChecks++
      return authenticated ? { user: { id: "qa-user" } } : null
    },
  },
})
mock.module(file("src/components/auth/login-form.tsx"), {
  namedExports: { LoginForm: () => createElement("h1", null, "Iniciar sesión") },
})
mock.module("next/navigation", {
  namedExports: {
    redirect: (target: string) => {
      throw new Error(`redirect:${target}`)
    },
  },
})

test("login rechaza destinos externos, barras invertidas, controles y bucles normalizados", () => {
  for (const value of [
    undefined,
    null,
    ["/entregas"],
    "https://outside.invalid",
    "//outside.invalid",
    "/\\outside.invalid",
    "/\n/outside.invalid",
    "/%5coutside.invalid",
    "/%2foutside.invalid",
    "/a/../login",
    "/login?redirectTo=/eventos",
  ])
    assert.equal(safeLoginRedirect(value), "/")
  assert.equal(safeLoginRedirect("/entregas?rut=12345678-5#detalle"), "/entregas?rut=12345678-5#detalle")
  assert.equal(safeLoginRedirect("/a/../resumen"), "/resumen")
})
test("la página de login utiliza la sesión compartida que filtra cuentas desactivadas", async () => {
  const { default: Page } = await import("../src/app/login/page")
  authenticated = false
  assert.ok(
    renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ redirectTo: "/resumen" }) })).includes(
      "Iniciar sesión",
    ),
  )
  authenticated = true
  await assert.rejects(Page({ searchParams: Promise.resolve({ redirectTo: "/entregas" }) }), /redirect:\/entregas/)
  assert.equal(sessionChecks, 2)
})
test("cerrar sesión vacía datos de la cuenta anterior y cancela respuestas tardías", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(["audit", "old-admin"], { private: true })
  let complete!: (value: unknown) => void
  const pending = client
    .fetchQuery({
      queryKey: ["requests"],
      queryFn: () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    })
    .catch(() => undefined)
  await clearSessionCache(client)
  complete({ private: "late response" })
  await pending
  assert.equal(client.getQueryCache().getAll().length, 0)
  assert.equal(client.getQueryData(["audit", "old-admin"]), undefined)
})
