import type { CmsContent } from '../../src/cms/types.ts';

export interface AuthRecord {
  id: string;
  email: string;
  passwordHash: string;
  failed: number;
  lockedUntil: number;
  totpSecret: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  csrf: string;
  expires: number;
  created: number;
}

export interface AuditEvent {
  time: string;
  userId: string;
  action: string;
  resource: string;
  ok: boolean;
}

export interface MediaRecord {
  id: string;
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  createdAt: string;
}

export interface Storage {
  init(): Promise<void>;
  readContent(): Promise<CmsContent>;
  writeContent(content: unknown): Promise<CmsContent>;
  readAuth(): Promise<AuthRecord | null>;
  writeAuth(record: AuthRecord): Promise<void>;
  readSessions(): Promise<SessionRecord[]>;
  writeSessions(records: SessionRecord[]): Promise<void>;
  appendAudit(event: AuditEvent): Promise<void>;
  readAudit(limit?: number): Promise<AuditEvent[]>;
  saveMedia(record: MediaRecord): Promise<void>;
  getMedia(id: string): Promise<MediaRecord | null>;
  deleteMedia(id: string): Promise<void>;
}

export function publicContent(content: CmsContent): CmsContent {
  return {
    ...content,
    projects: content.projects.filter(item => item.published),
    products: content.products.filter(item => item.published && item.status !== 'archived'),
    services: content.services.filter(item => item.published),
    technologies: content.technologies.filter(item => item.published),
    team: content.team.filter(item => item.published),
    testimonials: content.testimonials.filter(item => item.published),
  };
}
