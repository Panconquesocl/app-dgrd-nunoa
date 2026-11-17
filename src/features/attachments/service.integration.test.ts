import "dotenv/config"
import assert from "node:assert/strict"
import { test } from "node:test"
import { randomUUID, createHash } from "node:crypto"
import { createServer } from "node:http"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import {
  beginUpload,
  completeUpload,
  cancelUpload,
  listAttachments,
  findAttachment,
  deleteAttachment,
  confirmAttachments,
  processDeletions,
  cleanup,
} from "./service"
import { deleteDelivery } from "@/features/deliveries/service"
import { deleteEvent, getEventDeletionImpact } from "@/features/events/service"
import { deleteActivity } from "@/features/activities/service"
import { type Owner, type Kind } from "./schemas"
import { getObject } from "./storage"
async function uploadAttachment(owner: Owner, kind: Kind, file: File, actor: { id: string; role: string }) {
  const ticket = await beginUpload(owner, kind, { name: file.name, size: file.size }, actor)
  try {
    const response = await fetch(ticket.uploadUrl, { method: "PUT", headers: ticket.headers, body: file })
    if (!response.ok) throw new AppError(503, "Carga fallida")
    return await completeUpload(ticket.id, actor)
  } catch (error) {
    await cancelUpload(ticket.id, actor).catch(() => undefined)
    throw error
  }
}
const bad = (status: number) => (error: unknown) => error instanceof AppError && error.status === status
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ8sAAAAASUVORK5CYII=",
  "base64",
)
test(
  "adjuntos privados: permisos, concurrencia, confirmación, auditoría, cascadas y reintentos durables",
  { skip: process.env.RUN_ATTACHMENTS_INTEGRATION !== "1" },
  async () => {
    const objects = new Map<string, Buffer>()
    let failPut = false,
      failDelete = false
    const etag = (body: Buffer) => `"${createHash("md5").update(body).digest("hex")}"`
    const server = createServer(async (req, res) => {
      const key = new URL(req.url!, "http://localhost").pathname
      if (req.method === "PUT") {
        const chunks: Buffer[] = []
        for await (const part of req) chunks.push(Buffer.from(part))
        if (failPut) {
          res.writeHead(503)
          res.end("<Error><Code>ServiceUnavailable</Code></Error>")
          return
        }
        if (req.headers["x-amz-copy-source"]) {
          const source = "/" + decodeURIComponent(String(req.headers["x-amz-copy-source"]).replace(/^\//, ""))
          const data = objects.get(source)
          if (!data || req.headers["x-amz-copy-source-if-match"] !== etag(data)) {
            res.writeHead(412)
            res.end("<Error><Code>PreconditionFailed</Code></Error>")
            return
          }
          objects.set(key, Buffer.from(data))
          res.writeHead(200, { "Content-Type": "application/xml" })
          res.end(
            `<CopyObjectResult><ETag>${etag(data)}</ETag><LastModified>2026-11-17T00:00:00Z</LastModified></CopyObjectResult>`,
          )
        } else {
          const data = Buffer.concat(chunks)
          objects.set(key, data)
          res.writeHead(200, { ETag: etag(data) })
          res.end()
        }
      } else if (req.method === "DELETE") {
        if (failDelete) {
          res.writeHead(503)
          res.end("<Error><Code>ServiceUnavailable</Code></Error>")
          return
        }
        objects.delete(key)
        res.writeHead(204)
        res.end()
      } else {
        const body = objects.get(key)
        res.writeHead(body ? 200 : 404, body ? { "Content-Length": String(body.length), ETag: etag(body) } : {})
        res.end(body)
      }
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    assert.ok(address && typeof address !== "string")
    Object.assign(process.env, {
      R2_ACCOUNT_ID: "isolated",
      R2_ACCESS_KEY_ID: "isolated",
      R2_SECRET_ACCESS_KEY: "isolated",
      R2_BUCKET_NAME: "test",
      R2_ENDPOINT: `http://127.0.0.1:${address.port}`,
    })
    const id = `attachments-${randomUUID()}`
    const actor = { id, role: "regular" }
    const admin = { id, role: "admin" }
    const ownerIds: string[] = []
    await prisma.user.create({ data: { id, name: "Adjuntos QA", email: `${id}@example.invalid` } })
    try {
      const delivery = await prisma.delivery.create({
        data: {
          folio: id,
          beneficiary: "QA",
          beneficiaryRut: "12345678-5",
          address: "QA",
          date: new Date(),
          createdBy: id,
        },
      })
      ownerIds.push(delivery.id)
      const owner = { resource: "deliveries", recordId: delivery.id } as const
      const type = await prisma.eventType.create({ data: { name: id, createdBy: id } })
      const event = await prisma.event.create({
        data: {
          folio: id,
          date: new Date(),
          address: "QA",
          institutions: "",
          actions: "",
          typeId: type.id,
          createdBy: id,
        },
      })
      ownerIds.push(event.id)
      const eventOwner = { resource: "events", recordId: event.id } as const
      await assert.rejects(listAttachments(eventOwner, actor), bad(403))
      await assert.rejects(uploadAttachment(eventOwner, "alfa", new File(["%PDF-1.4\n"], "alfa.pdf"), actor), bad(403))
      await assert.rejects(uploadAttachment(owner, "alfa", new File(["%PDF-1.4\n"], "alfa.pdf"), actor), bad(400))
      const file = await uploadAttachment(owner, "photo", new File([png], "foto.png"), actor)
      const row = await findAttachment(file.id, actor)
      assert.equal(row.status, "ready")
      assert.ok(row.bucket)
      assert.equal(
        Buffer.from(await (await getObject(row.bucket, row.key)).Body!.transformToByteArray()).equals(png),
        true,
      )
      assert.equal(JSON.stringify(await listAttachments(owner, actor)).includes(row.key), false)
      const replay = await beginUpload(owner, "photo", { name: "replay.png", size: png.length }, actor)
      assert.equal(new URL(replay.uploadUrl).searchParams.get("X-Amz-Expires"), "300")
      assert.ok(new URL(replay.uploadUrl).searchParams.get("X-Amz-SignedHeaders")?.includes("content-length"))
      assert.equal((await fetch(replay.uploadUrl, { method: "PUT", headers: replay.headers, body: png })).status, 200)
      await assert.rejects(completeUpload(replay.id, { id: "otro-usuario", role: "regular" }), bad(403))
      const confirmations = await Promise.allSettled([
        completeUpload(replay.id, actor),
        completeUpload(replay.id, actor),
      ])
      assert.ok(confirmations.some((result) => result.status === "fulfilled"))
      for (const result of confirmations) if (result.status === "rejected") assert.ok(bad(409)(result.reason))
      assert.deepEqual(await completeUpload(replay.id, actor), { id: replay.id })
      await cancelUpload(replay.id, actor)
      assert.ok(await prisma.evidence.findUnique({ where: { id: replay.id } }))
      await fetch(replay.uploadUrl, { method: "PUT", headers: replay.headers, body: new Uint8Array(png.length) })
      const final = await findAttachment(replay.id, actor)
      assert.ok(Buffer.from(await (await getObject(final.bucket!, final.key)).Body!.transformToByteArray()).equals(png))
      await deleteAttachment(replay.id, actor)
      const invalid = await beginUpload(owner, "photo", { name: "fake.png", size: 4 }, actor)
      await fetch(invalid.uploadUrl, { method: "PUT", headers: invalid.headers, body: "fake" })
      await assert.rejects(completeUpload(invalid.id, actor), bad(400))
      assert.equal(await prisma.evidence.findUnique({ where: { id: invalid.id } }), null)
      const wrongSize = await beginUpload(owner, "file", { name: "size.txt", size: 1 }, actor)
      await fetch(wrongSize.uploadUrl, { method: "PUT", headers: wrongSize.headers, body: "dos" })
      await assert.rejects(completeUpload(wrongSize.id, actor), bad(400))

      await assert.rejects(
        prisma.$transaction(async (tx) => {
          await tx.evidence.delete({ where: { id: file.id } })
          throw new Error("rollback de prueba")
        }),
        /rollback de prueba/,
      )
      assert.ok(await prisma.evidence.findUnique({ where: { id: file.id } }))
      assert.equal(await prisma.r2ObjectDeletion.count({ where: { key: row.key } }), 0)
      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { actorId: id, entityId: delivery.id, action: "update" },
      })
      assert.equal(JSON.stringify(audit).includes(row.key), false)
      assert.ok(JSON.stringify(audit.after).includes("foto.png"))
      await assert.rejects(deleteDelivery(delivery.id, id), bad(409))
      assert.ok(await prisma.delivery.findUnique({ where: { id: delivery.id } }))
      await prisma.$transaction(async (tx) => {
        await assert.rejects(confirmAttachments(tx, owner, ["stale"]), bad(409))
      })
      const results = await Promise.allSettled(
        Array.from({ length: 21 }, (_, i) =>
          uploadAttachment(owner, "file", new File([`archivo ${i}`], `${i}.txt`), actor),
        ),
      )
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 20)
      assert.equal(await prisma.evidence.count({ where: { deliveryId: delivery.id, kind: "file" } }), 20)
      const alfa = await uploadAttachment(eventOwner, "alfa", new File(["%PDF-1.4\n"], "alfa.pdf"), admin)
      await assert.rejects(findAttachment(alfa.id, actor), bad(403))
      await assert.rejects(uploadAttachment(eventOwner, "alfa", new File(["%PDF-1.4\n"], "otro.pdf"), admin), bad(409))
      failDelete = true
      await deleteAttachment(file.id, actor)
      assert.equal(await prisma.evidence.findUnique({ where: { id: file.id } }), null)
      assert.ok(await prisma.r2ObjectDeletion.findFirst({ where: { key: row.key } }))
      failDelete = false
      await prisma.r2ObjectDeletion.updateMany({
        where: { recordId: delivery.id },
        data: { nextAttemptAt: new Date(0) },
      })
      await processDeletions(owner)
      assert.equal(await prisma.r2ObjectDeletion.count({ where: { key: row.key } }), 0)
      failPut = true
      await assert.rejects(uploadAttachment(eventOwner, "file", new File(["fail"], "fail.txt"), admin), bad(503))
      failPut = false
      assert.equal(await prisma.evidence.count({ where: { eventId: event.id, status: "pending" } }), 0)
      const action = await prisma.strategicAction.create({
        data: {
          number: Math.floor(Math.random() * 1e9),
          year: 2026,
          title: id,
          topics: "QA",
          implementation: "QA",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
          createdBy: id,
        },
      })
      const activity = await prisma.activity.create({
        data: {
          date: new Date(),
          location: "QA",
          objective: "QA",
          participants: "QA",
          actionId: action.id,
          createdBy: id,
        },
      })
      ownerIds.push(activity.id)
      const activityOwner = { resource: "activities", recordId: activity.id } as const
      const legacy = await prisma.evidence.create({
        data: {
          activityId: activity.id,
          name: "Histórico",
          type: "application/pdf",
          size: 10,
          key: "legacy",
          createdBy: id,
        },
      })
      await assert.rejects(deleteActivity(activity.id, id, [legacy.id]), bad(409))
      assert.equal((await listAttachments(activityOwner, actor))[0].available, false)
      await prisma.evidence.delete({ where: { id: legacy.id } })
      const evidence = await uploadAttachment(activityOwner, "evidence", new File([png], "evidencia.png"), actor)
      await deleteActivity(activity.id, id, [evidence.id])
      assert.equal(await prisma.evidence.count({ where: { activityId: activity.id } }), 0)
      await deleteEvent(event.id, { ...(await getEventDeletionImpact(event.id)), attachmentIds: [alfa.id] }, id)
      const files = await listAttachments(owner, actor)
      await deleteDelivery(
        delivery.id,
        id,
        files.map((f) => f.id),
      )
      assert.equal(await prisma.evidence.count({ where: { deliveryId: delivery.id } }), 0)
      await prisma.r2ObjectDeletion.updateMany({
        where: { recordId: { in: ownerIds } },
        data: { nextAttemptAt: new Date(0) },
      })
      for (const recordId of ownerIds)
        await processDeletions({
          resource: recordId === delivery.id ? "deliveries" : recordId === event.id ? "events" : "activities",
          recordId,
        })
      assert.equal(await prisma.r2ObjectDeletion.count({ where: { recordId: { in: ownerIds } } }), 0)
      assert.equal(objects.size, 0)
      // Expiración de una carga interrumpida: la cola sobrevive al borrado de sus metadatos.
      const pendingDelivery = await prisma.delivery.create({
        data: { folio: id + "-pending", beneficiary: "QA", address: "QA", date: new Date(), createdBy: id },
      })
      ownerIds.push(pendingDelivery.id)
      await prisma.evidence.create({
        data: {
          deliveryId: pendingDelivery.id,
          kind: "file",
          status: "pending",
          bucket: "test",
          key: `pending-${id}`,
          name: "pendiente",
          type: "text/plain",
          size: 1,
          createdBy: id,
          uploadExpiresAt: new Date(0),
        },
      })
      await cleanup()
      assert.equal(await prisma.evidence.count({ where: { deliveryId: pendingDelivery.id } }), 0)
      assert.equal(await prisma.r2ObjectDeletion.count({ where: { recordId: pendingDelivery.id } }), 1)
    } finally {
      await prisma.evidence.deleteMany({ where: { createdBy: id } })
      await prisma.delivery.deleteMany({ where: { createdBy: id } })
      await prisma.event.deleteMany({ where: { createdBy: id } })
      await prisma.activity.deleteMany({ where: { createdBy: id } })
      await prisma.strategicAction.deleteMany({ where: { createdBy: id } })
      await prisma.eventType.deleteMany({ where: { name: id } })
      await prisma.r2ObjectDeletion.deleteMany({ where: { recordId: { in: ownerIds } } })
      await prisma.auditLog.deleteMany({ where: { actorId: id } })
      await prisma.user.delete({ where: { id } })
      server.close()
      server.closeAllConnections()
      await prisma.$disconnect()
    }
  },
)
