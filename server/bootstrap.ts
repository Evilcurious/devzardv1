import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './env.ts';
import { getStorage } from './storage/index.ts';

const BCRYPT_ROUNDS = 12;

// Seeds the initial admin from env vars if no admin exists yet.
// Credentials are only ever read server-side and stored as a bcrypt hash.
export async function bootstrapAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL)) {
    console.warn('[devzard] ADMIN_EMAIL is not a valid email address; skipping admin bootstrap.');
    return;
  }
  if (ADMIN_PASSWORD.length < 12) {
    console.warn('[devzard] ADMIN_PASSWORD must be at least 12 characters; skipping admin bootstrap.');
    return;
  }
  const storage = getStorage();
  if (await storage.readAuth()) return;
  await storage.writeAuth({
    id: randomUUID(),
    email: ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS),
    failed: 0,
    lockedUntil: 0,
    totpSecret: null,
  });
  console.log('[devzard] Seeded admin account from ADMIN_EMAIL.');
}
