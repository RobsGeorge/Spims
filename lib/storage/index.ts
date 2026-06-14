import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { AppError } from "@/lib/errors";

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env["STORAGE_ENDPOINT"] &&
      process.env["STORAGE_BUCKET"] &&
      process.env["STORAGE_KEY"] &&
      process.env["STORAGE_SECRET"],
  );
}

function getClient(): S3Client | null {
  if (!isStorageConfigured()) return null;
  return new S3Client({
    region: "auto",
    endpoint: process.env["STORAGE_ENDPOINT"],
    credentials: {
      accessKeyId: process.env["STORAGE_KEY"]!,
      secretAccessKey: process.env["STORAGE_SECRET"]!,
    },
    forcePathStyle: true,
  });
}

export type PresignedUpload = {
  uploadUrl: string;
  fileUrl: string;
  key: string;
};

/** Create a presigned PUT URL for uploading a file. Returns null when storage is not configured. */
export async function createPresignedUploadUrl(opts: {
  keyPrefix: string;
  filename: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<PresignedUpload | null> {
  const client = getClient();
  if (!client) return null;

  const bucket = process.env["STORAGE_BUCKET"]!;
  const safeName = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${opts.keyPrefix}/${randomUUID()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: opts.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: opts.expiresInSeconds ?? 3600,
  });

  const endpoint = process.env["STORAGE_ENDPOINT"]!.replace(/\/$/, "");
  const fileUrl = `${endpoint}/${bucket}/${key}`;

  return { uploadUrl, fileUrl, key };
}

/** Create a presigned GET URL for downloading a stored file. */
export async function createPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const command = new GetObjectCommand({
    Bucket: process.env["STORAGE_BUCKET"]!,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export function requireStorage(): void {
  if (!isStorageConfigured()) {
    throw AppError.badRequest("Object storage is not configured");
  }
}
