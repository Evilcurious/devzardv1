// Server-only environment access. These values must never be sent to the client
// or prefixed with VITE_. Do not import this module from anything under src/.

export const DATABASE_URL = process.env.DATABASE_URL?.trim() || '';
export const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN?.trim() || '';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || '';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export const hasDatabase = DATABASE_URL.length > 0;
export const hasBlob = BLOB_READ_WRITE_TOKEN.length > 0;
export const isProduction = process.env.NODE_ENV === 'production';

export function assertProductionConfig() {
  if (!isProduction) return;
  const missing: string[] = [];
  if (!hasDatabase) missing.push('DATABASE_URL');
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) missing.push('SESSION_SECRET');
  if (missing.length) {
    console.warn(`[devzard] Missing production configuration: ${missing.join(', ')}. Falling back to local storage where possible.`);
  }
  if (!hasBlob) {
    console.warn('[devzard] BLOB_READ_WRITE_TOKEN is not set. Uploads will use local disk storage.');
  }
}
