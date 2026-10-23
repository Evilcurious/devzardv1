import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { SEED } from '../../src/cms/seed.ts';
import type { CmsContent } from '../../src/cms/types.ts';
import { contentSchema } from '../validate.ts';
import type { AuditEvent, AuthRecord, MediaRecord, SessionRecord, Storage } from './types.ts';

// Each editable collection is a table. Homepage + settings are single-row JSON
// documents. Everything is written through parameterized queries only.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS collections (
  name TEXT PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS documents (
  name TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_until BIGINT NOT NULL DEFAULT 0,
  totp_secret TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  csrf TEXT NOT NULL,
  expires BIGINT NOT NULL,
  created BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  time TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ok BOOLEAN NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  pathname TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const COLLECTIONS = ['projects', 'products', 'services', 'technologies', 'team', 'testimonials'] as const;

type QueryFn = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export class PostgresStorage implements Storage {
  private run: QueryFn;

  constructor(connectionString: string, query?: QueryFn) {
    if (query) {
      this.run = query;
    } else {
      const sql: NeonQueryFunction<false, false> = neon(connectionString);
      this.run = (text, params = []) => sql.query(text, params) as Promise<Record<string, unknown>[]>;
    }
  }

  async init() {
    // neon() splits on statement boundaries via the http driver; run each DDL alone.
    for (const statement of SCHEMA.split(';').map(part => part.trim()).filter(Boolean)) {
      await this.run(`${statement};`);
    }
    const countRows = await this.run('SELECT count(*)::int AS count FROM documents');
    if (Number(countRows[0]?.count ?? 0) === 0) await this.writeContent({ ...SEED, updatedAt: new Date().toISOString() });
  }

  async readContent(): Promise<CmsContent> {
    const collectionRows = await this.run('SELECT name, items FROM collections');
    const documentRows = await this.run('SELECT name, data FROM documents');
    const collections = Object.fromEntries(collectionRows.map(row => [String(row.name), row.items]));
    const documents = Object.fromEntries(documentRows.map(row => [String(row.name), row.data]));
    const candidate = {
      version: 1,
      updatedAt: new Date().toISOString(),
      projects: collections.projects ?? SEED.projects,
      products: collections.products ?? SEED.products,
      services: collections.services ?? SEED.services,
      technologies: collections.technologies ?? SEED.technologies,
      team: collections.team ?? SEED.team,
      testimonials: collections.testimonials ?? SEED.testimonials,
      homepage: documents.homepage ?? SEED.homepage,
      settings: documents.settings ?? SEED.settings,
    };
    const result = contentSchema.safeParse(candidate);
    if (!result.success) return { ...SEED, updatedAt: new Date().toISOString() };
    return result.data as unknown as CmsContent;
  }

  async writeContent(content: unknown): Promise<CmsContent> {
    const checked = contentSchema.parse({ ...(content as object), updatedAt: new Date().toISOString() });
    for (const name of COLLECTIONS) {
      const items = JSON.stringify((checked as unknown as Record<string, unknown>)[name] ?? []);
      await this.run(
        'INSERT INTO collections (name, items, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (name) DO UPDATE SET items = EXCLUDED.items, updated_at = now()',
        [name, items],
      );
    }
    for (const name of ['homepage', 'settings'] as const) {
      await this.run(
        'INSERT INTO documents (name, data, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now()',
        [name, JSON.stringify((checked as unknown as Record<string, unknown>)[name])],
      );
    }
    return checked as unknown as CmsContent;
  }

  async readAuth(): Promise<AuthRecord | null> {
    const rows = await this.run('SELECT id, email, password_hash, failed, locked_until, totp_secret FROM admin_users ORDER BY updated_at ASC LIMIT 1');
    if (!rows.length) return null;
    const row = rows[0];
    return {
      id: String(row.id),
      email: String(row.email),
      passwordHash: String(row.password_hash),
      failed: Number(row.failed),
      lockedUntil: Number(row.locked_until),
      totpSecret: row.totp_secret ? String(row.totp_secret) : null,
    };
  }

  async writeAuth(record: AuthRecord): Promise<void> {
    await this.run(
      `INSERT INTO admin_users (id, email, password_hash, failed, locked_until, totp_secret, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
         failed = EXCLUDED.failed, locked_until = EXCLUDED.locked_until, totp_secret = EXCLUDED.totp_secret, updated_at = now()`,
      [record.id, record.email, record.passwordHash, record.failed, record.lockedUntil, record.totpSecret],
    );
  }

  async readSessions(): Promise<SessionRecord[]> {
    const now = Date.now();
    await this.run('DELETE FROM admin_sessions WHERE expires < $1', [now]);
    const rows = await this.run('SELECT id, user_id, csrf, expires, created FROM admin_sessions');
    return rows.map(row => ({ id: String(row.id), userId: String(row.user_id), csrf: String(row.csrf), expires: Number(row.expires), created: Number(row.created) }));
  }

  async writeSessions(records: SessionRecord[]): Promise<void> {
    const live = records.filter(item => item.expires > Date.now());
    const ids = live.map(item => item.id);
    if (ids.length) {
      await this.run(`DELETE FROM admin_sessions WHERE id <> ALL($1::text[])`, [ids]);
    } else {
      await this.run('DELETE FROM admin_sessions');
    }
    for (const item of live) {
      await this.run(
        `INSERT INTO admin_sessions (id, user_id, csrf, expires, created) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET expires = EXCLUDED.expires`,
        [item.id, item.userId, item.csrf, item.expires, item.created],
      );
    }
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    await this.run('INSERT INTO audit_log (time, user_id, action, resource, ok) VALUES ($1, $2, $3, $4, $5)', [event.time, event.userId, event.action, event.resource, event.ok]);
    await this.run('DELETE FROM audit_log WHERE id < (SELECT COALESCE(max(id), 0) - 2000 FROM audit_log)');
  }

  async readAudit(limit = 100): Promise<AuditEvent[]> {
    const rows = await this.run('SELECT time, user_id, action, resource, ok FROM audit_log ORDER BY id DESC LIMIT $1', [Math.min(limit, 500)]);
    return rows.map(row => ({ time: new Date(row.time as string).toISOString(), userId: String(row.user_id), action: String(row.action), resource: String(row.resource), ok: Boolean(row.ok) }));
  }

  async saveMedia(record: MediaRecord): Promise<void> {
    await this.run(
      'INSERT INTO media (id, url, pathname, content_type, size, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
      [record.id, record.url, record.pathname, record.contentType, record.size, record.createdAt],
    );
  }

  async getMedia(id: string): Promise<MediaRecord | null> {
    const rows = await this.run('SELECT id, url, pathname, content_type, size, created_at FROM media WHERE id = $1', [id]);
    if (!rows.length) return null;
    const row = rows[0];
    return { id: String(row.id), url: String(row.url), pathname: String(row.pathname), contentType: String(row.content_type), size: Number(row.size), createdAt: new Date(row.created_at as string).toISOString() };
  }

  async deleteMedia(id: string): Promise<void> {
    await this.run('DELETE FROM media WHERE id = $1', [id]);
  }
}
