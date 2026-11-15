CREATE TABLE "event_folio_counter" (
  "year" INTEGER PRIMARY KEY,
  "lastValue" BIGINT NOT NULL CHECK ("lastValue" >= 0)
);
INSERT INTO "event_folio_counter" ("year", "lastValue")
SELECT split_part("folio", '-', 2)::integer, MAX(split_part("folio", '-', 3)::bigint)
FROM "event" WHERE "folio" ~ '^EV-[0-9]{4}-[0-9]+$'
GROUP BY split_part("folio", '-', 2)::integer;
