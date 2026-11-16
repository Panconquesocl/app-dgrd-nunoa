import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const calls: string[] = []
const tx = Object.fromEntries(
  ["delivery", "request", "event"].map((model, index) => [
    model,
    {
      count: async (...args: unknown[]) => {
        assert.deepEqual(args, [])
        calls.push(model)
        return index + 1
      },
    },
  ]),
)
mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
  defaultExport: {
    $transaction: async (work: (client: typeof tx) => Promise<unknown>) => work(tx),
  },
})

test("contadores globales: omite consultas y cifras restringidas, y deniega roles desconocidos", async () => {
  const { getNavigationCounts } = await import("../src/features/summary/service")
  assert.deepEqual(await getNavigationCounts("regular"), { deliveries: 1 })
  assert.deepEqual(calls, ["delivery"])
  calls.length = 0
  assert.deepEqual(await getNavigationCounts("admin"), { deliveries: 1, requests: 2, events: 3 })
  assert.deepEqual(calls.sort(), ["delivery", "event", "request"])
  calls.length = 0
  await assert.rejects(getNavigationCounts("unknown"), { status: 403 })
  assert.deepEqual(calls, [])
})
