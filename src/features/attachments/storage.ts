import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { AppError } from "@/lib/api-error"
let client: S3Client | undefined
export function storageConfig() {
  const {
    R2_ACCOUNT_ID: account,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET_NAME: bucket,
  } = process.env
  if (!account || !accessKeyId || !secretAccessKey || !bucket)
    throw new AppError(503, "El almacenamiento de archivos aún no está configurado.")
  client ??= new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 3,
  })
  return { client, bucket }
}
export async function putObject(bucket: string, key: string, body: Uint8Array, type: string) {
  const { client } = storageConfig()
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: type }), {
    abortSignal: AbortSignal.timeout(90_000),
  })
}
export async function getObject(bucket: string, key: string) {
  return storageConfig().client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
    abortSignal: AbortSignal.timeout(90_000),
  })
}
export async function removeObject(bucket: string, key: string) {
  await storageConfig().client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
    abortSignal: AbortSignal.timeout(15_000),
  })
}
