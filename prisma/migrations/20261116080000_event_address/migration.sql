BEGIN;

-- Renombrar conserva los valores y las relaciones de los eventos existentes.
ALTER TABLE "event" RENAME COLUMN "sector" TO "address";

DROP TRIGGER "event_audit" ON "event";
CREATE TRIGGER "event_audit" BEFORE INSERT OR UPDATE OR DELETE ON "event"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('events', 'folio,typeId,date,address,affectedCount,institutions,actions,createdBy');

COMMIT;
