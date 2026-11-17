import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
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
    requestChecksumCalculation: "WHEN_REQUIRED",
  })
  return { client, bucket }
}
export const stagingKey = (key: string) => `staging/${key}`
export const UPLOAD_URL_SECONDS = 300
export async function signUpload(bucket: string, key: string, size: number) {
  return getSignedUrl(
    storageConfig().client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: stagingKey(key),
      ContentType: "application/octet-stream",
      ContentLength: size,
    }),
    { expiresIn: UPLOAD_URL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) },
  )
}
export async function publishObject(bucket: string, key: string, etag: string, type: string) {
  const source = `${bucket}/${stagingKey(key)}`.split("/").map(encodeURIComponent).join("/")
  await storageConfig().client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: key,
      CopySource: source,
      CopySourceIfMatch: etag,
      MetadataDirective: "REPLACE",
      ContentType: type,
    }),
    { abortSignal: AbortSignal.timeout(90_000) },
  )
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
