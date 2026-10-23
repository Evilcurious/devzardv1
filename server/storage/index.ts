import { DATABASE_URL, hasDatabase } from '../env.ts';
import { FileStorage } from './file.ts';
import { PostgresStorage } from './postgres.ts';
import type { Storage } from './types.ts';

let instance: Storage | null = null;

export function getStorage(): Storage {
  if (instance) return instance;
  instance = hasDatabase ? new PostgresStorage(DATABASE_URL) : new FileStorage();
  return instance;
}

export type { AuditEvent, AuthRecord, MediaRecord, SessionRecord, Storage } from './types.ts';
export { publicContent } from './types.ts';
