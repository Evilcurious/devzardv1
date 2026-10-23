import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const secretFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'session-secret');

let cached = '';

export async function sessionSecret(): Promise<string> {
  if (cached) return cached;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    cached = process.env.SESSION_SECRET;
    return cached;
  }
  try {
    cached = (await readFile(secretFile, 'utf8')).trim();
    if (cached) return cached;
  } catch { /* generate below */ }
  cached = randomBytes(48).toString('base64url');
  try {
    await mkdir(path.dirname(secretFile), { recursive: true });
    await writeFile(secretFile, cached, { encoding: 'utf8', mode: 0o600 });
  } catch { /* ephemeral secret is acceptable for dev */ }
  return cached;
}
