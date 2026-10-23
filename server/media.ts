import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Response } from 'express';
import { del, put } from '@vercel/blob';
import { BLOB_READ_WRITE_TOKEN, hasBlob } from './env.ts';
import { getStorage } from './storage/index.ts';
import type { MediaRecord } from './storage/types.ts';

export const MAX_UPLOAD = 2 * 1024 * 1024;
const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'uploads');

const IMAGE_TYPES: Record<string, { magic: number[]; ext: string }> = {
  'image/jpeg': { magic: [0xff, 0xd8, 0xff], ext: 'jpg' },
  'image/png': { magic: [0x89, 0x50, 0x4e, 0x47], ext: 'png' },
  'image/gif': { magic: [0x47, 0x49, 0x46], ext: 'gif' },
  'image/webp': { magic: [0x52, 0x49, 0x46, 0x46], ext: 'webp' },
};

export function detectImage(buffer: Buffer): { type: string; ext: string } | null {
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { type: 'image/webp', ext: 'webp' };
  }
  for (const [type, spec] of Object.entries(IMAGE_TYPES)) {
    if (type === 'image/webp') continue;
    if (spec.magic.every((byte, index) => buffer[index] === byte)) return { type, ext: spec.ext };
  }
  return null;
}

function safeId(length = 18) {
  return randomBytes(length).toString('base64url').replace(/[^\w-]/g, '');
}

export async function storeUpload(buffer: Buffer): Promise<MediaRecord | null> {
  const detected = detectImage(buffer);
  if (!detected) return null;
  if (buffer.length < 24 || buffer.length > MAX_UPLOAD) return null;
  const id = safeId();
  // Generated, server-controlled filename — the browser filename is never used.
  const pathname = `devzard/${id}.${detected.ext}`;
  const createdAt = new Date().toISOString();

  if (hasBlob) {
    const result = await put(pathname, buffer, {
      access: 'public',
      contentType: detected.type,
      token: BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    const record: MediaRecord = { id, url: result.url, pathname: result.pathname, contentType: detected.type, size: buffer.length, createdAt };
    await getStorage().saveMedia(record);
    return record;
  }

  await mkdir(uploadsDir, { recursive: true });
  const file = path.join(uploadsDir, `${id}.${detected.ext}`);
  if (!file.startsWith(uploadsDir)) return null;
  await writeFile(file, buffer, { mode: 0o600 });
  const record: MediaRecord = { id, url: `/api/media/${id}`, pathname: `${id}.${detected.ext}`, contentType: detected.type, size: buffer.length, createdAt };
  await getStorage().saveMedia(record);
  return record;
}

export async function removeUpload(id: string): Promise<void> {
  const record = await getStorage().getMedia(id);
  if (record && hasBlob && record.url.startsWith('http')) {
    try { await del(record.url, { token: BLOB_READ_WRITE_TOKEN }); } catch { /* already gone */ }
  } else if (record) {
    const file = path.join(uploadsDir, record.pathname);
    if (file.startsWith(uploadsDir)) { try { await unlink(file); } catch { /* already gone */ } }
  }
  await getStorage().deleteMedia(id);
}

export async function resolveMediaUrl(id: string): Promise<string | null> {
  const record = await getStorage().getMedia(id);
  return record?.url ?? null;
}

export async function streamLocalMedia(id: string, res: Response): Promise<boolean> {
  const record = await getStorage().getMedia(id);
  if (!record || record.url.startsWith('http')) return false;
  const file = path.join(uploadsDir, record.pathname);
  if (!file.startsWith(uploadsDir)) return false;
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size > MAX_UPLOAD) return false;
    const header = Buffer.alloc(16);
    const handle = await open(file, 'r');
    await handle.read(header, 0, 16, 0);
    await handle.close();
    const detected = detectImage(header);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type(detected?.type || 'application/octet-stream');
    createReadStream(file).pipe(res);
    return true;
  } catch { return false; }
}
