BEGIN;

ALTER TABLE "delivery" ADD COLUMN "observations" TEXT;

-- Incluir el nuevo campo en la auditoría sin modificar migraciones aplicadas.
DROP TRIGGER "delivery_audit" ON "delivery";
CREATE TRIGGER "delivery_audit" BEFORE INSERT OR UPDATE OR DELETE ON "delivery"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('deliveries', 'folio,beneficiary,beneficiaryRut,neighborhoodAssociationId,contact,address,observations,date,requestId,eventId,createdBy');

COMMIT;
