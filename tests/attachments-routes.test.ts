import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"
import { AppError } from "../src/lib/api-error"
const file = (path: string) => pathToFileURL(resolve(path)).href
let signedIn = false,
  allowed = false,
  reads = 0,
  uploads = 0,
  cleanups = 0
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    requireUser: async () => {
      if (!signedIn) throw new AppError(401, "Sesión requerida")
      return { id: "qa", role: "regular" }
    },
  },
})
mock.module(file("src/features/attachments/service.ts"), {
  namedExports: {
    assertOwner: async () => {
      if (!allowed) throw new AppError(403, "Sin permiso")
    },
    listAttachments: async () => [],
    uploadAttachment: async () => {
      uploads++
      return { id: "qa" }
    },
    deleteAttachment: async () => {},
    cleanup: async () => {
      cleanups++
      return { deleted: 0 }
    },
    findAttachment: async () => {
      throw new AppError(403, "Sin permiso")
    },
  },
})
mock.module(file("src/features/attachments/files.ts"), {
  namedExports: {
    readUpload: async () => {
      reads++
      return new File(["QA"], "QA.txt")
    },
  },
})
test("adjuntos: autoriza antes de leer 25 MB y protege contenido y limpieza", async () => {
  const collection = await import(file("src/app/api/attachments/route.ts"))
  const content = await import(file("src/app/api/attachments/[id]/content/route.ts"))
  const cleanup = await import(file("src/app/api/attachments/cleanup/route.ts"))
  const request = () =>
    new Request("http://localhost/api/attachments?resource=events&recordId=other&kind=file", {
      method: "POST",
      body: "incorrecto",
    })
  assert.equal((await collection.POST(request())).status, 401)
  signedIn = true
  assert.equal((await collection.POST(request())).status, 403)
  assert.equal(reads, 0)
  assert.equal(uploads, 0)
  allowed = true
  assert.equal((await collection.POST(request())).status, 201)
  assert.equal(reads, 1)
  assert.equal(uploads, 1)
  assert.equal(
    (await content.GET(new Request("http://localhost"), { params: Promise.resolve({ id: "private" }) })).status,
    403,
  )
  process.env.R2_CLEANUP_SECRET = "test-cleanup-secret"
  assert.equal((await cleanup.POST(new Request("http://localhost", { method: "POST" }))).status, 401)
  assert.equal(cleanups, 0)
  assert.equal(
    (
      await cleanup.POST(
        new Request("http://localhost", { method: "POST", headers: { authorization: "Bearer test-cleanup-secret" } }),
      )
    ).status,
    200,
  )
  assert.equal(cleanups, 1)
})
