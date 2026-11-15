-- No fusionar tipos existentes automáticamente: sus eventos deben conservar identidad.
-- Si existen duplicados normalizados, la migración se detiene sin modificar datos.
CREATE UNIQUE INDEX "event_type_name_normalized_key" ON "event_type" (lower(btrim("name")));
