import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED } from '../../src/cms/seed.ts';
import type { CmsContent } from '../../src/cms/types.ts';
import { contentSchema } from '../validate.ts';
import type { AuditEvent, AuthRecord, MediaRecord, SessionRecord, Storage } from './types.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const contentFile = path.join(root, 'content.json');
const authFile = path.join(root, 'auth.json');
const sessionFile = path.join(root, 'sessions.json');
const auditFile = path.join(root, 'audit.jsonl');
const mediaFile = path.join(root, 'media.json');

let writeChain = Promise.resolve();
function queued(work: () => Promise<void>) {
  writeChain = writeChain.then(work, work);
  return writeChain;
}

async function atomicWrite(file: string, data: string) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, data, 'utf8');
  await rename(temp, file);
}

export class FileStorage implements Storage {
  async init() {
    await mkdir(root, { recursive: true });
    try { await readFile(contentFile, 'utf8'); }
    catch { await atomicWrite(contentFile, JSON.stringify({ ...SEED, updatedAt: new Date().toISOString() }, null, 2)); }
  }

  async readContent(): Promise<CmsContent> {
    try {
      const parsed = JSON.parse(await readFile(contentFile, 'utf8'));
      const result = contentSchema.safeParse(parsed);
      if (result.success) return result.data as unknown as CmsContent;
    } catch { /* fall through to seed */ }
    return { ...SEED, updatedAt: new Date().toISOString() };
  }

  writeContent(content: unknown): Promise<CmsContent> {
    const checked = contentSchema.parse({ ...(content as object), updatedAt: new Date().toISOString() });
    return queued(() => atomicWrite(contentFile, JSON.stringify(checked, null, 2))).then(() => checked as unknown as CmsContent);
  }

  async readAuth(): Promise<AuthRecord | null> {
    try { return JSON.parse(await readFile(authFile, 'utf8')) as AuthRecord; }
    catch { return null; }
  }

  writeAuth(record: AuthRecord): Promise<void> {
    return queued(() => atomicWrite(authFile, JSON.stringify(record)));
  }

  async readSessions(): Promise<SessionRecord[]> {
    try {
      const all = JSON.parse(await readFile(sessionFile, 'utf8')) as SessionRecord[];
      return all.filter(item => item.expires > Date.now());
    } catch { return []; }
  }

  writeSessions(records: SessionRecord[]): Promise<void> {
    const live = records.filter(item => item.expires > Date.now());
    return queued(() => atomicWrite(sessionFile, JSON.stringify(live)));
  }

  appendAudit(event: AuditEvent): Promise<void> {
    return queued(async () => {
      await mkdir(root, { recursive: true });
      await writeFile(auditFile, `${JSON.stringify(event)}\n`, { encoding: 'utf8', flag: 'a' });
    });
  }

  async readAudit(limit = 100): Promise<AuditEvent[]> {
    try {
      const lines = (await readFile(auditFile, 'utf8')).trim().split('\n').filter(Boolean);
      return lines.slice(-limit).map(line => JSON.parse(line) as AuditEvent).reverse();
    } catch { return []; }
  }

  private async readMedia(): Promise<MediaRecord[]> {
    try { return JSON.parse(await readFile(mediaFile, 'utf8')) as MediaRecord[]; }
    catch { return []; }
  }

  async saveMedia(record: MediaRecord): Promise<void> {
    const all = await this.readMedia();
    await queued(() => atomicWrite(mediaFile, JSON.stringify([...all.filter(item => item.id !== record.id), record])));
  }

  async getMedia(id: string): Promise<MediaRecord | null> {
    return (await this.readMedia()).find(item => item.id === id) ?? null;
  }

  async deleteMedia(id: string): Promise<void> {
    const all = await this.readMedia();
    await queued(() => atomicWrite(mediaFile, JSON.stringify(all.filter(item => item.id !== id))));
  }
}
