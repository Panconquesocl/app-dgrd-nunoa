import assert from "node:assert/strict"
import { test } from "node:test"
import { inspectFile, readUpload } from "./files"
import { MAX_FILE_SIZE } from "./schemas"
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
test("multipart acotado: archivo único, cuerpo real y Content-Length falso", async () => {
  const data = new FormData()
  data.set("file", new File([png], "foto.png"))
  assert.equal((await readUpload(new Request("http://localhost", { method: "POST", body: data }))).name, "foto.png")
  data.append("file", new File([png], "otra.png"))
  await assert.rejects(readUpload(new Request("http://localhost", { method: "POST", body: data })), bad(400))
  await assert.rejects(
    readUpload(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=test", "Content-Length": "1" },
        body: new Uint8Array(MAX_FILE_SIZE + 65537),
      }),
    ),
    bad(413),
  )
})
