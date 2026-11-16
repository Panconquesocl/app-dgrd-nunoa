-- Solo operaciones nuevas; no se reconstruye historial previo.
CREATE TABLE "audit_log" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  "operationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityLabel" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_log_action_check" CHECK (action IN ('create', 'update', 'delete'))
);
CREATE INDEX "audit_log_createdAt_id_idx" ON "audit_log"("createdAt", id);
CREATE INDEX "audit_log_resource_createdAt_idx" ON "audit_log"(resource, "createdAt");
CREATE INDEX "audit_log_actorId_createdAt_idx" ON "audit_log"("actorId", "createdAt");
CREATE INDEX "audit_log_operationId_idx" ON "audit_log"("operationId");

-- Lista explícita de campos por tabla: columnas futuras no se registran por accidente.
-- No hay triggers sobre cuentas, sesiones, tokens ni credenciales.
CREATE FUNCTION capture_domain_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $audit$
DECLARE
  actor JSONB := NULLIF(current_setting('app.audit_actor', true), '')::jsonb;
  operation_id TEXT := NULLIF(current_setting('app.audit_operation_id', true), '');
  old_row JSONB;
  new_row JSONB;
  old_values JSONB := '{}'::jsonb;
  new_values JSONB := '{}'::jsonb;
  row_data JSONB;
  field TEXT;
  record_id TEXT;
  record_label TEXT;
  operation TEXT;
BEGIN
  IF actor IS NULL OR operation_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP <> 'INSERT' THEN old_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_row := to_jsonb(NEW); END IF;
  row_data := COALESCE(new_row, old_row);
  FOREACH field IN ARRAY string_to_array(TG_ARGV[1], ',') LOOP
    IF TG_OP <> 'UPDATE' OR (old_row->field) IS DISTINCT FROM (new_row->field) THEN
      IF TG_OP <> 'INSERT' THEN old_values := old_values || jsonb_build_object(field, old_row->field); END IF;
      IF TG_OP <> 'DELETE' THEN new_values := new_values || jsonb_build_object(field, new_row->field); END IF;
    END IF;
  END LOOP;
  IF TG_OP = 'UPDATE' AND old_values = '{}'::jsonb THEN RETURN NEW; END IF;
  record_id := row_data->>'id';
  record_label := COALESCE(row_data->>'folio', row_data->>'email', row_data->>'name', row_data->>'type', row_data->>'title', row_data->>'objective', record_id);
  operation := CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'DELETE' THEN 'delete' ELSE 'update' END;
  IF TG_TABLE_NAME = 'delivery_item' THEN
    record_id := row_data->>'deliveryId';
    SELECT folio INTO record_label FROM delivery WHERE id = record_id;
    IF record_label IS NULL THEN
      SELECT "entityLabel" INTO record_label FROM audit_log
      WHERE "operationId" = operation_id AND resource = 'deliveries' AND "entityId" = record_id AND action = 'delete'
      ORDER BY "createdAt" DESC, id DESC LIMIT 1;
    END IF;
    record_label := 'Insumos de ' || COALESCE(record_label, record_id);
    -- La entrega sigue siendo la entidad consultable; el cambio corresponde a su lista de insumos.
    old_values := jsonb_build_object('items', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_values END);
    new_values := jsonb_build_object('items', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE new_values END);
    operation := 'update';
  END IF;
  INSERT INTO audit_log ("operationId", "actorId", "actorName", "actorEmail", resource, action, "entityId", "entityLabel", "before", "after")
  VALUES (operation_id, actor->>'id', actor->>'name', actor->>'email', TG_ARGV[0], operation,
    record_id, record_label,
    CASE WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME <> 'delivery_item' THEN NULL ELSE old_values END,
    CASE WHEN TG_OP = 'DELETE' AND TG_TABLE_NAME <> 'delivery_item' THEN NULL ELSE new_values END);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$audit$;

CREATE TRIGGER "delivery_audit" BEFORE INSERT OR UPDATE OR DELETE ON "delivery"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('deliveries', 'folio,beneficiary,beneficiaryRut,neighborhoodAssociationId,contact,address,date,requestId,eventId,createdBy');

CREATE TRIGGER "delivery_item_audit" BEFORE INSERT OR UPDATE OR DELETE ON "delivery_item"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('deliveries', 'id,supplyId,quantity');

CREATE TRIGGER "supply_audit" BEFORE INSERT OR UPDATE OR DELETE ON "supply"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('supplies', 'type,unit,createdBy');

CREATE TRIGGER "neighborhood_association_audit" BEFORE INSERT OR UPDATE OR DELETE ON "neighborhood_association"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('neighborhood-associations', 'number,name,active,createdBy');

CREATE TRIGGER "request_audit" BEFORE INSERT OR UPDATE OR DELETE ON "request"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('requests', 'folio,channel,description,response,status,eventId,createdBy');

CREATE TRIGGER "event_audit" BEFORE INSERT OR UPDATE OR DELETE ON "event"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('events', 'folio,typeId,date,sector,affectedCount,institutions,actions,createdBy');

CREATE TRIGGER "strategic_action_audit" BEFORE INSERT OR UPDATE OR DELETE ON "strategic_action"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('strategic-actions', 'number,year,title,topics,implementation,startDate,endDate,createdBy');

CREATE TRIGGER "activity_audit" BEFORE INSERT OR UPDATE OR DELETE ON "activity"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('activities', 'actionId,date,location,objective,participants,createdBy');

CREATE TRIGGER "event_type_audit" BEFORE INSERT OR UPDATE OR DELETE ON "event_type"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('event-types', 'name,createdBy');

CREATE TRIGGER "user_audit" BEFORE INSERT OR UPDATE OR DELETE ON "user"
FOR EACH ROW EXECUTE FUNCTION capture_domain_audit('users', 'name,lastName,email,role,banned,banExpires');
