-- No inferir apellidos ni modificar identidades históricas.
ALTER TABLE "user" ADD COLUMN "lastName" TEXT;
-- Evitar duplicados institucionales con distinta capitalización o espacios.
-- Si hay duplicados, detenerse para revisarlos, sin fusionar cuentas.
CREATE UNIQUE INDEX "user_email_normalized_key" ON "user" (lower(btrim("email")));
