import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3 = new S3Client({
  region: process.env.YT_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.YT_S3_ACCESS_KEY || '',
    secretAccessKey: process.env.YT_S3_SECRET_KEY || '',
  },
});

const BUCKET = process.env.YT_S3_BUCKET || 'youtube-automation-assets';

/**
 * Upload a file buffer to S3.
 * Returns the full S3 URL.
 */
export async function uploadFile(buffer, key, contentType = 'application/octet-stream') {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

/**
 * Download a file from S3.
 * Returns a Buffer.
 */
export async function downloadFile(key) {
  const response = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Get a presigned URL for temporary access.
 */
export async function getPresignedUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Delete a file from S3.
 */
export async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

/**
 * Build a standardized S3 key path.
 * Types: 'sources', 'visuals', 'thumbnails', 'narrations', 'videos'
 */
export function buildKey(projectId, type, filename) {
  return `projects/${projectId}/${type}/${filename}`;
}

/**
 * Generate a unique filename with extension.
 */
export function uniqueFilename(extension) {
  const id = crypto.randomUUID();
  return `${id}.${extension}`;
}
