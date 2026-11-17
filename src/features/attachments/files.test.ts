import assert from "node:assert/strict"
import { test } from "node:test"
import { inspectFile, readUploadMetadata } from "./files"
import { MAX_FILE_SIZE, uploadMetadataSchema } from "./schemas"
import { AppError } from "@/lib/api-error"
const bad = (status: number) => (error: unknown) => error instanceof AppError && error.status === status
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ8sAAAAASUVORK5CYII=",
  "base64",
)
test("verifica los bytes y no confía en extensión o MIME del navegador", async () => {
  await assert.rejects(
    inspectFile(new File(["<script>bad</script>"], "foto.png", { type: "image/png" }), "photo"),
    bad(400),
  )
  await assert.rejects(inspectFile(new File([png], "informe.pdf", { type: "application/pdf" }), "alfa"), bad(400))
  assert.equal((await inspectFile(new File([png], "foto.exe", { type: "text/html" }), "photo")).type, "image/png")
  assert.equal(
    (await inspectFile(new File(["contenido"], "datos.txt", { type: "text/html" }), "file")).type,
    "application/octet-stream",
  )
  assert.equal((await inspectFile(new File(["%PDF-1.4\n"], "informe.pdf"), "alfa")).type, "application/pdf")
})
test("límites inclusivos de 25 MB y rechazo de archivos vacíos", async () => {
  await assert.rejects(inspectFile(new File([], "vacio"), "file"), bad(400))
  assert.equal((await inspectFile(new File([new Uint8Array(MAX_FILE_SIZE)], "limite.bin"), "file")).size, MAX_FILE_SIZE)
  await assert.rejects(inspectFile(new File([new Uint8Array(MAX_FILE_SIZE + 1)], "grande.bin"), "file"), bad(400))
})
test("control JSON acotado incluso con Content-Length falso; no recibe binarios", async () => {
  const body = JSON.stringify({ name: "foto.png", size: png.length })
  assert.deepEqual(await readUploadMetadata(new Request("http://localhost", { method: "POST", body })), {
    name: "foto.png",
    size: png.length,
  })
  await assert.rejects(readUploadMetadata(new Request("http://localhost", { method: "POST", body: "{" })), bad(400))
  await assert.rejects(
    readUploadMetadata(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Length": "1" },
        body: new Uint8Array(4097),
      }),
    ),
    bad(413),
  )
})

test("reserva: permite 25 MB exactos y rechaza tamaño mayor, vacío o fraccionario", () => {
  assert.equal(uploadMetadataSchema.safeParse({ name: "archivo", size: MAX_FILE_SIZE }).success, true)
  for (const size of [0, -1, 0.5, MAX_FILE_SIZE + 1])
    assert.equal(uploadMetadataSchema.safeParse({ name: "archivo", size }).success, false)
})
