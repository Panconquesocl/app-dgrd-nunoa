import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"
import { NextRequest } from "next/server"
import { authorizeUser } from "../src/lib/authorization"
import type { Resource, Action } from "../src/lib/permissions"

let user: { id: string; role: string } | null = null
let calls: string[] = []
let lastArgs: unknown[] = []
const file = (path: string) => pathToFileURL(resolve(path)).href
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    requirePermission: async (resource: Resource, action: Action) => authorizeUser(user, resource, action),
  },
})
const entities = [
  ["deliveries", "Delivery", "Deliveries"],
  ["supplies", "Supply", "Supplies"],
  ["neighborhood-associations", "NeighborhoodAssociation", "NeighborhoodAssociations"],
  ["strategic-actions", "StrategicAction", "StrategicActions"],
] as const
for (const [resource, singular, plural] of entities) {
  const names = [`create${singular}`, `update${singular}`, `delete${singular}`, `get${singular}`, `list${plural}`]
  if (resource === "deliveries") names.push("getDeliveryOptions")
  mock.module(file(`src/features/${resource}/service.ts`), {
    namedExports: Object.fromEntries(
      names.map((name) => [
        name,
        async (...args: unknown[]) => {
          lastArgs = args
          calls.push(name)
          return { id: "record-by-another-user" }
        },
      ]),
    ),
  })
}

test("handlers reales: autorización antes de leer datos o llamar a los servicios", async () => {
  for (const [resource, singular, plural] of entities) {
    const collection = await import(file(`src/app/api/${resource}/route.ts`))
    const detail = await import(file(`src/app/api/${resource}/[id]/route.ts`))
    const options = resource === "deliveries" ? await import(file("src/app/api/deliveries/options/route.ts")) : null
    const cases = [
      [collection, "GET", `list${plural}`],
      [collection, "POST", `create${singular}`],
      [detail, "GET", `get${singular}`],
      [detail, "PATCH", `update${singular}`],
      [detail, "DELETE", `delete${singular}`],
      ...(options ? [[options, "GET", "getDeliveryOptions"]] : []),
    ] as const
    for (const [handler, method, service] of cases) {
      for (const role of [null, "user", "admin", "unknown"]) {
        user = role === null ? null : { id: "operator", role }
        calls = []
        // Invalid body also proves that forbidden writes are rejected before parsing.
        const request = new NextRequest(`http://localhost/api/${resource}`, {
          method,
          ...(method === "POST" || method === "PATCH" ? { body: "{" } : {}),
        })
        const forbidden =
          role === "unknown" ||
          (role === "user" && resource !== "deliveries" && resource !== "supplies" && method !== "GET")
        if (role === null || forbidden) {
          const response = await handler[method](request, { params: Promise.resolve({ id: "other-authors-record" }) })
          assert.equal(response.status, role === null ? 401 : 403, `${role} ${method} ${resource}`)
          assert.deepEqual(calls, [])
          assert.equal(typeof (await response.json()).message, "string")
        } else {
          const payloads: Record<string, object> = {
            deliveries: {
              beneficiary: "Persona",
              neighborhoodAssociationId: "cm12345678901234567890123",
              address: "Dirección",
              date: "2026-10-30",
              items: [{ supplyId: "cm12345678901234567890124", quantity: 1 }],
            },
            supplies: { type: "Agua", unit: "litro" },
            "neighborhood-associations": { number: 1, name: "Junta", active: true },
            "strategic-actions": {
              number: 1,
              year: 2026,
              title: "Acción",
              topics: "Tema",
              implementation: "Plan",
              startDate: "2026-01-01",
              endDate: "2026-12-31",
            },
          }
          const allowedRequest = new NextRequest(`http://localhost/api/${resource}`, {
            method,
            ...(method === "POST" || method === "PATCH" ? { body: JSON.stringify(payloads[resource]) } : {}),
          })
          const response = await handler[method](allowedRequest, {
            params: Promise.resolve({ id: "other-authors-record" }),
          })
          assert.equal(response.status, method === "DELETE" ? 204 : method === "POST" ? 201 : 200)
          assert.deepEqual(calls, [service])
        }
      }
    }
  }
})

test("historial de junta: transmite filtros y rechaza consultas inválidas sin llamar al servicio", async () => {
  const { GET } = await import("../src/app/api/neighborhood-associations/[id]/route")
  user = { id: "operator", role: "user" }
  const context = { params: Promise.resolve({ id: "junta" }) }
  const response = await GET(
    new NextRequest(
      "http://localhost/api/neighborhood-associations/junta?from=2026-01-01&to=2026-01-31&order=asc&supplyId=clxxxxxxxxxxxxxxxxxxxxxxx",
    ),
    context,
  )
  assert.equal(response.status, 200)
  assert.deepEqual(lastArgs, [
    "junta",
    { from: "2026-01-01", to: "2026-01-31", order: "asc", supplyId: "clxxxxxxxxxxxxxxxxxxxxxxx" },
  ])
  for (const query of ["from=2026-02-30", "from=2026-02-01&to=2026-01-01", "supplyId=invalid"]) {
    calls = []
    const invalid = await GET(new NextRequest(`http://localhost/api/neighborhood-associations/junta?${query}`), context)
    assert.equal(invalid.status, 400)
    assert.deepEqual(calls, [])
    assert.ok((await invalid.json()).fieldErrors)
  }
})
