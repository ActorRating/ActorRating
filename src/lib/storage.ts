import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Thin storage abstraction over AWS S3 with optional Supabase support.
 * Default is S3. Set SUPABASE_URL and SUPABASE_ANON_KEY to implement later.
 */
export interface UploadParams {
  key: string
  contentType: string
  body: Buffer | Uint8Array
  cacheControl?: string
}

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
})

export async function uploadToStorage({ key, contentType, body, cacheControl }: UploadParams): Promise<string> {
  const provider = process.env.STORAGE_PROVIDER || (process.env.S3_BUCKET ? 's3' : 'local')
  const base = (process.env.CDN_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')

  if (provider === 'local') {
    const outPath = path.join(process.cwd(), 'public', key)
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, body)
    const url = `${base}/` + key
    return url
  }

  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error('S3_BUCKET is not set')

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
      ACL: 'public-read',
    })
  )

  const url = base
    ? `${base}/${key}`
    : `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`
  return url
}

export function buildShareKey(kind: 'feed' | 'story' | 'og', slug: string): string {
  return `share/${kind}/${slug}.png`
}

