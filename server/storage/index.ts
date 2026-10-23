import { DATABASE_URL, hasDatabase } from '../env';
import { FileStorage } from './file';
import { PostgresStorage } from './postgres';
import type { Storage } from './types';

let instance: Storage | null = null;

export function getStorage(): Storage {
  if (instance) return instance;
  instance = hasDatabase ? new PostgresStorage(DATABASE_URL) : new FileStorage();
  return instance;
}

export type { AuditEvent, AuthRecord, MediaRecord, SessionRecord, Storage } from './types';
export { publicContent } from './types';
