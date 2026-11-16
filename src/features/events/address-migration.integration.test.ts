import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { Client } from "pg"
import { test } from "node:test"

test(
  "renombrar Sector conserva valores, relaciones y auditoría previa; nuevos cambios auditan Dirección",
  { skip: process.env.RUN_EVENTS_INTEGRATION !== "1", timeout: 60000 },
  async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL })
    const schema = `event_address_${randomUUID().replaceAll("-", "")}`
    await client.connect()
    try {
      await client.query(`CREATE SCHEMA "${schema}"`)
      await client.query(`SET search_path TO "${schema}"`)
      const root = new URL("../../../prisma/migrations/", import.meta.url)
      const target = "20261116080000_event_address"
      for (const name of (await readdir(root)).filter((name) => /^\d/.test(name) && name < target).sort())
        await client.query(await readFile(new URL(`${name}/migration.sql`, root), "utf8"))
      await client.query(
        `INSERT INTO "user" (id,name,email,"updatedAt") VALUES ('author','Autor','autor@example.invalid',now())`,
      )
      await client.query(
        `INSERT INTO event_type (id,name,"createdBy","updatedAt") VALUES ('type','Incendio','author',now())`,
      )
      await client.query(
        `SELECT set_config('app.audit_actor',$1,false),set_config('app.audit_operation_id',$2,false)`,
        [JSON.stringify({ id: "author", name: "Autor", email: "autor@example.invalid" }), randomUUID()],
      )
      await client.query(
        `INSERT INTO "event" (id,folio,date,sector,"typeId",institutions,actions,"createdBy","updatedAt") VALUES ('event','EV-LEGADO','2026-11-15',$1,'type','','','author',now())`,
        ["Sector existente sin reinterpretar"],
      )
      await client.query(
        `INSERT INTO "request" (id,folio,channel,"eventId","createdBy","updatedAt") VALUES ('request','SOL-LEGADO','Teléfono','event','author',now())`,
      )
      await client.query(
        `INSERT INTO delivery (id,folio,beneficiary,address,date,"eventId","requestId","createdBy","updatedAt") VALUES ('delivery','ENT-LEGADO','Persona','Dirección de entrega','2026-11-15','event','request','author',now())`,
      )
      const { sector, ...before } = (await client.query(`SELECT * FROM "event" WHERE id='event'`)).rows[0]
      const oldAudit = (
        await client.query(`SELECT id,"before","after" FROM audit_log WHERE resource='events' AND "entityId"='event'`)
      ).rows
      await client.query(await readFile(new URL(`${target}/migration.sql`, root), "utf8"))
      assert.deepEqual((await client.query(`SELECT * FROM "event" WHERE id='event'`)).rows[0], {
        ...before,
        address: sector,
      })
      assert.equal((await client.query(`SELECT "eventId" FROM "request" WHERE id='request'`)).rows[0].eventId, "event")
      assert.deepEqual(
        (await client.query(`SELECT "eventId","requestId",address FROM delivery WHERE id='delivery'`)).rows[0],
        { eventId: "event", requestId: "request", address: "Dirección de entrega" },
      )
      assert.deepEqual(
        (await client.query(`SELECT id,"before","after" FROM audit_log WHERE resource='events' AND "entityId"='event'`))
          .rows,
        oldAudit,
      )
      await client.query(`UPDATE "event" SET address=$1 WHERE id='event'`, ["Av. Grecia 4500"])
      const changed = (
        await client.query(
          `SELECT "before","after" FROM audit_log WHERE resource='events' AND "entityId"='event' AND action='update'`,
        )
      ).rows[0]
      assert.deepEqual(changed, { before: { address: sector }, after: { address: "Av. Grecia 4500" } })
    } finally {
      await client.query("ROLLBACK")
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await client.end()
    }
  },
)
