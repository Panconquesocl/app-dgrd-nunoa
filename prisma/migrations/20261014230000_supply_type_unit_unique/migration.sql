-- Identidad del catálogo: nombre + unidad, sin distinguir mayúsculas ni
-- espacios en los extremos. El índice también protege altas concurrentes.
-- No se modifican ni se fusionan registros existentes.
CREATE UNIQUE INDEX "supply_type_unit_normalized_key"
ON "supply" (lower(btrim("type")), lower(btrim("unit")));
