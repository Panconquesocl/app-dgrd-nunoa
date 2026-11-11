BEGIN;

-- No se infieren identidades ni números oficiales desde el antiguo texto libre.
-- En bases con entregas, preparar primero un mapeo revisado de jv al catálogo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "delivery") THEN
    RAISE EXCEPTION 'Existen entregas con jv libre. Se requiere un mapeo revisado al catálogo antes de aplicar esta migración; no se modificaron los datos.';
  END IF;
END $$;

CREATE TABLE "neighborhood_association" (
  "id" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT NOT NULL,
  CONSTRAINT "neighborhood_association_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "neighborhood_association_number_positive" CHECK ("number" > 0)
);
CREATE UNIQUE INDEX "neighborhood_association_number_key" ON "neighborhood_association"("number");
ALTER TABLE "neighborhood_association" ADD CONSTRAINT "neighborhood_association_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery" ADD COLUMN "neighborhoodAssociationId" TEXT NOT NULL;
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_neighborhoodAssociationId_fkey"
  FOREIGN KEY ("neighborhoodAssociationId") REFERENCES "neighborhood_association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "delivery_neighborhoodAssociationId_idx" ON "delivery"("neighborhoodAssociationId");
ALTER TABLE "delivery" DROP COLUMN "jv";

COMMIT;
