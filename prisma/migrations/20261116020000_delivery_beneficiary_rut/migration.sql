-- Los registros históricos mantienen su RUT desconocido; no se infiere del nombre.
ALTER TABLE "delivery" ADD COLUMN "beneficiaryRut" TEXT;
ALTER TABLE "delivery" ALTER COLUMN "neighborhoodAssociationId" DROP NOT NULL;
-- No es único: un mismo beneficiario puede recibir varias entregas.
CREATE INDEX "delivery_beneficiaryRut_date_idx" ON "delivery"("beneficiaryRut", "date");
