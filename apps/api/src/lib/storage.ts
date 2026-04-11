/**
 * File storage abstraction — local filesystem for Sprint 3, S3 for prod.
 *
 * Uploads land under apps/api/uploads/<kind>/<entityId>/<uuid>.<ext>
 * and are served via @fastify/static at /uploads/*.
 *
 * When we move to S3 (Sprint 3.5 or before pilot), swap the implementation
 * behind this interface — routes and DB columns stay the same.
 */
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';

const ROOT = path.resolve(process.cwd(), 'uploads');

export type UploadKind = 'installs' | 'tickets' | 'pm';

export interface StoredFile {
  key: string; // relative path stored in DB
  url: string; // absolute URL for frontend
  size: number;
  mime: string;
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };
  return map[mime.toLowerCase()] ?? 'bin';
}

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

export function isAllowedImage(mime: string): boolean {
  return ALLOWED_IMAGE.has(mime.toLowerCase());
}

export function isAllowedVideo(mime: string): boolean {
  return ALLOWED_VIDEO.has(mime.toLowerCase());
}

export async function saveUpload(
  kind: UploadKind,
  entityId: string,
  file: MultipartFile,
): Promise<StoredFile> {
  const dir = path.join(ROOT, kind, entityId);
  await mkdir(dir, { recursive: true });

  const ext = extFromMime(file.mimetype);
  const name = `${randomUUID()}.${ext}`;
  const abs = path.join(dir, name);

  const out = createWriteStream(abs);
  await pipeline(file.file, out);

  // Size after write (file.file is a stream; we don't know size until drained)
  const { stat } = await import('node:fs/promises');
  const { size } = await stat(abs);

  const relKey = path.posix.join(kind, entityId, name);
  return {
    key: relKey,
    url: `/uploads/${relKey}`,
    size,
    mime: file.mimetype,
  };
}

export async function deleteUpload(key: string): Promise<void> {
  const abs = path.join(ROOT, key);
  try {
    await unlink(abs);
  } catch {
    // Already gone — ignore
  }
}

export function getUploadRoot(): string {
  return ROOT;
}
