import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 Configuration - try env first, then fallback to null
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "portal-do-artista";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// R2 is enabled only if all required env vars are set
export const r2Enabled = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);

// Don't throw error, just export null client if not configured
export const r2Client = r2Enabled ? new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
}) : null;

export function getR2Config() {
  return {
    accountId: R2_ACCOUNT_ID,
    bucketName: R2_BUCKET_NAME,
    publicUrl: R2_PUBLIC_URL,
    enabled: r2Enabled,
  };
}

/**
 * Upload file to Cloudflare R2
 * @param fileBuffer - File buffer
 * @param key - Storage key (path inside bucket)
 * @param contentType - MIME type
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000", // 1 year cache
  });

  await r2Client.send(command);

  // Return public URL
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete file from Cloudflare R2
 * @param key - Storage key to delete (can be full URL or just key)
 */
export async function deleteFromR2(key: string): Promise<void> {
  // If it's a URL, extract just the key
  let cleanKey = key;
  if (key.startsWith('http')) {
    // Extract everything after the bucket name
    const parts = key.split('/');
    cleanKey = parts.slice(parts.indexOf(R2_BUCKET_NAME) + 1).join('/');
    if (!cleanKey) {
      // Fallback: get last two parts (folder/filename)
      cleanKey = parts.slice(-2).join('/');
    }
  }
  
  console.log(`Deleting from R2: ${cleanKey}`);
  
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanKey,
  });

  await r2Client.send(command);
}

/**
 * Generate signed URL for private files (valid for 1 hour)
 * @param key - Storage key
 * @returns Signed URL
 */
export async function getSignedR2Url(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

/**
 * Generate storage key for files
 * @param folder - Folder name (covers, audio, photos)
 * @param filename - Original filename
 * @returns Unique key for R2 storage
 */
export function generateR2Key(folder: string, filename: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  return `${folder}/${timestamp}_${randomId}_${filename}`;
}
