BEGIN;
CREATE TYPE "AttachmentKind" AS ENUM ('photo','file','alfa','evidence');
CREATE TYPE "AttachmentStatus" AS ENUM ('pending','ready');
ALTER TABLE evidence ALTER COLUMN "activityId" DROP NOT NULL,
  ADD COLUMN "deliveryId" TEXT,
  ADD COLUMN "eventId" TEXT,
  ADD COLUMN kind "AttachmentKind" NOT NULL DEFAULT 'evidence',
  ADD COLUMN status "AttachmentStatus" NOT NULL DEFAULT 'ready',
  ADD COLUMN bucket TEXT,
  ADD COLUMN "ownerLabel" TEXT,
  ADD COLUMN "uploadExpiresAt" TIMESTAMP(3),
  ADD CONSTRAINT evidence_delivery_fkey FOREIGN KEY ("deliveryId") REFERENCES delivery(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT evidence_event_fkey FOREIGN KEY ("eventId") REFERENCES "event"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT evidence_one_parent CHECK (num_nonnulls("activityId","deliveryId","eventId")=1),
  ADD CONSTRAINT evidence_kind_parent CHECK (
    ("activityId" IS NOT NULL AND kind='evidence') OR
    ("deliveryId" IS NOT NULL AND kind IN ('photo','file')) OR
    ("eventId" IS NOT NULL AND kind IN ('photo','file','alfa'))
  );
CREATE INDEX evidence_deliveryId_idx ON evidence("deliveryId");
CREATE INDEX evidence_eventId_idx ON evidence("eventId");
CREATE INDEX evidence_status_uploadExpiresAt_idx ON evidence(status,"uploadExpiresAt");
CREATE UNIQUE INDEX evidence_bucket_key_key ON evidence(bucket,key);
CREATE UNIQUE INDEX evidence_event_alfa_key ON evidence("eventId") WHERE kind='alfa';

CREATE TABLE r2_object_deletion (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  resource TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX r2_object_deletion_bucket_key_key ON r2_object_deletion(bucket,key);
CREATE INDEX r2_object_deletion_nextAttemptAt_idx ON r2_object_deletion("nextAttemptAt");

CREATE FUNCTION enqueue_r2_object_deletion() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $queue$
BEGIN
  IF OLD.bucket IS NOT NULL THEN
    INSERT INTO r2_object_deletion(bucket,key,resource,"recordId","nextAttemptAt")
    VALUES (OLD.bucket,OLD.key,
      CASE WHEN OLD."deliveryId" IS NOT NULL THEN 'deliveries' WHEN OLD."eventId" IS NOT NULL THEN 'events' ELSE 'activities' END,
      COALESCE(OLD."deliveryId",OLD."eventId",OLD."activityId"),
      CASE WHEN OLD.status='pending' THEN clock_timestamp()+interval '5 minutes' ELSE clock_timestamp() END)
    ON CONFLICT (bucket,key) DO NOTHING;
  END IF;
  RETURN OLD;
END;
$queue$;
CREATE TRIGGER evidence_r2_delete AFTER DELETE ON evidence FOR EACH ROW EXECUTE FUNCTION enqueue_r2_object_deletion();

CREATE FUNCTION capture_attachment_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $audit$
DECLARE
  actor JSONB := NULLIF(current_setting('app.audit_actor',true),'')::jsonb;
  operation_id TEXT := NULLIF(current_setting('app.audit_operation_id',true),'');
  row_data JSONB;
  resource_name TEXT;
  record_id TEXT;
  metadata JSONB;
BEGIN
  IF actor IS NULL OR operation_id IS NULL THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP='DELETE' THEN
    IF OLD.status<>'ready' THEN RETURN OLD; END IF;
    row_data:=to_jsonb(OLD);
  ELSE
    IF NEW.status<>'ready' THEN RETURN NEW; END IF;
    IF TG_OP='UPDATE' AND OLD.status='ready' THEN RETURN NEW; END IF;
    row_data:=to_jsonb(NEW);
  END IF;
  resource_name:=CASE WHEN row_data->>'deliveryId' IS NOT NULL THEN 'deliveries' WHEN row_data->>'eventId' IS NOT NULL THEN 'events' ELSE 'activities' END;
  record_id:=COALESCE(row_data->>'deliveryId',row_data->>'eventId',row_data->>'activityId');
  metadata:=jsonb_build_object('attachment',jsonb_build_object('id',row_data->>'id','name',row_data->>'name','type',row_data->>'type','size',(row_data->>'size')::integer,'kind',row_data->>'kind'));
  INSERT INTO audit_log("operationId","actorId","actorName","actorEmail",resource,action,"entityId","entityLabel","before","after")
  VALUES(operation_id,actor->>'id',actor->>'name',actor->>'email',resource_name,'update',record_id,
    'Adjuntos de '||COALESCE(row_data->>'ownerLabel',record_id),
    CASE WHEN TG_OP='DELETE' THEN metadata ELSE NULL END,
    CASE WHEN TG_OP='DELETE' THEN NULL ELSE metadata END);
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$audit$;
CREATE TRIGGER evidence_attachment_audit AFTER INSERT OR UPDATE OR DELETE ON evidence FOR EACH ROW EXECUTE FUNCTION capture_attachment_audit();
COMMIT;
