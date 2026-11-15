ALTER TABLE "request" ADD COLUMN "description" TEXT;
ALTER TABLE "delivery" DROP CONSTRAINT "delivery_requestId_fkey";
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "request_folio_counter" (
  "year" INTEGER PRIMARY KEY,
  "lastValue" BIGINT NOT NULL CHECK ("lastValue" >= 0)
);
-- Conservar el máximo existente por año; ignorar folios legados no correlativos.
INSERT INTO "request_folio_counter" ("year", "lastValue")
SELECT split_part("folio", '-', 2)::integer, MAX(split_part("folio", '-', 3)::bigint)
FROM "request" WHERE "folio" ~ '^SOL-[0-9]{4}-[0-9]+$'
GROUP BY split_part("folio", '-', 2)::integer;
