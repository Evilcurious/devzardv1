import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { isProduction } from './env.ts';
import { MAX_UPLOAD, removeUpload, storeUpload, streamLocalMedia } from './media.ts';
import { withResolvedMedia } from './resolve.ts';
import { sessionSecret } from './secret.ts';
import { getStorage, publicContent, type SessionRecord } from './storage/index.ts';
import { contentSchema, credentialsSchema, passwordChangeSchema } from './validate.ts';

const COOKIE = 'dz_session';
const CSRF_COOKIE = 'dz_csrf';
const SESSION_MS = 8 * 60 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;
const BCRYPT_ROUNDS = 12;
const MAX_FAILED = 8;
const LOCK_MS = 15 * 60 * 1000;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminId?: string;
    }
  }
}

function token(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function fail(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

async function loadSession(req: Request) {
  const id = req.cookies?.[COOKIE];
  if (!id || typeof id !== 'string') return null;
  const storage = getStorage();
  const sessions = await storage.readSessions();
  const record = sessions.find(item => item.id === id && item.expires > Date.now());
  if (!record) return null;
  if (Date.now() - record.created > SESSION_MS) {
    await storage.writeSessions(sessions.filter(item => item.id !== id));
    return null;
  }
  record.expires = Date.now() + IDLE_MS;
  await storage.writeSessions(sessions);
  return record;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await loadSession(req);
    if (!session) return fail(res, 401, 'Authentication required.');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const header = String(req.headers['x-csrf-token'] || '');
      const cookie = String(req.cookies?.[CSRF_COOKIE] || '');
      if (!header || !cookie || !safeEqual(header, cookie) || !safeEqual(header, session.csrf)) {
        return fail(res, 403, 'Request could not be verified.');
      }
    }
    req.adminId = session.userId;
    next();
  } catch {
    fail(res, 500, 'Something went wrong.');
  }
}

function setSessionCookies(res: Response, session: SessionRecord, secure: boolean) {
  const base = { httpOnly: true, sameSite: 'strict' as const, secure, path: '/', maxAge: IDLE_MS };
  res.cookie(COOKIE, session.id, base);
  res.cookie(CSRF_COOKIE, session.csrf, { ...base, httpOnly: false });
}

async function startSession(res: Request, response: Response, userId: string) {
  const storage = getStorage();
  const sessions = (await storage.readSessions()).filter(item => item.userId !== userId || item.expires > Date.now());
  const session: SessionRecord = { id: token(), userId, csrf: token(), expires: Date.now() + IDLE_MS, created: Date.now() };
  await storage.writeSessions([...sessions, session]);
  setSessionCookies(response, session, res.secure || isProduction);
  return session;
}

async function audit(userId: string, action: string, resource: string, ok: boolean) {
  try { await getStorage().appendAudit({ time: new Date().toISOString(), userId, action, resource, ok }); }
  catch { /* audit must never break the request */ }
}

export function createApp(options: { serveStatic?: boolean } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        frameSrc: ["'self'", 'https://www.deephq.online'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: isProduction ? { maxAge: 63072000, includeSubDomains: true } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  app.use(cookieParser());
  app.use((req, res, next) => {
    const type = String(req.headers['content-type'] || '');
    if (type.startsWith('image/') || type.includes('multipart/')) return next();
    express.json({ limit: '1mb' })(req, res, next);
  });

  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Invalid credentials' } });
  const writeLimit = rateLimit({ windowMs: 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false });
  const uploadLimit = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

  app.get('/api/content', async (_req, res) => {
    try {
      const content = await withResolvedMedia(publicContent(await getStorage().readContent()));
      res.json(content);
    } catch (error) {
      console.error('content read failed:', (error as Error).message);
      fail(res, 500, 'Content is temporarily unavailable.');
    }
  });

  app.get('/api/media/:id', async (req, res) => {
    const id = String(req.params.id || '');
    if (!/^[\w-]+$/.test(id)) return fail(res, 400, 'Invalid file.');
    const served = await streamLocalMedia(id, res).catch(() => false);
    if (!served) fail(res, 404, 'Not found.');
  });

  app.get('/api/admin/setup-needed', async (_req, res) => {
    try { res.json({ needed: !(await getStorage().readAuth()) }); }
    catch { fail(res, 500, 'Something went wrong.'); }
  });

  app.get('/api/admin/session', async (req, res) => {
    try {
      const session = await loadSession(req);
      if (!session) return fail(res, 401, 'Authentication required.');
      const auth = await getStorage().readAuth();
      res.json({ email: auth?.email || '', csrf: session.csrf, totpEnabled: Boolean(auth?.totpSecret) });
    } catch { fail(res, 500, 'Something went wrong.'); }
  });

  app.post('/api/admin/setup', loginLimit, async (req, res) => {
    try {
      const storage = getStorage();
      if (await storage.readAuth()) return fail(res, 403, 'Invalid credentials');
      const body = credentialsSchema.parse(req.body);
      const record = { id: randomUUID(), email: body.email.trim().toLowerCase(), passwordHash: await bcrypt.hash(body.password, BCRYPT_ROUNDS), failed: 0, lockedUntil: 0, totpSecret: null };
      await storage.writeAuth(record);
      const session = await startSession(req, res, record.id);
      await audit(record.id, 'setup', 'admin', true);
      res.json({ email: record.email, csrf: session.csrf });
    } catch {
      fail(res, 400, 'Invalid credentials');
    }
  });

  app.post('/api/admin/login', loginLimit, async (req, res) => {
    const storage = getStorage();
    let auth = null;
    try {
      const body = credentialsSchema.parse(req.body);
      auth = await storage.readAuth();
      if (!auth || auth.lockedUntil > Date.now()) {
        if (auth) await audit(auth.id, 'login', 'admin', false);
        return fail(res, 401, 'Invalid credentials');
      }
      const match = await bcrypt.compare(body.password, auth.passwordHash);
      if (!match || body.email.trim().toLowerCase() !== auth.email) {
        const failed = auth.failed + 1;
        await storage.writeAuth({ ...auth, failed, lockedUntil: failed >= MAX_FAILED ? Date.now() + LOCK_MS : 0 });
        await audit(auth.id, 'login', 'admin', false);
        return fail(res, 401, 'Invalid credentials');
      }
      await storage.writeAuth({ ...auth, failed: 0, lockedUntil: 0 });
      const session = await startSession(req, res, auth.id);
      await audit(auth.id, 'login', 'admin', true);
      res.json({ email: auth.email, csrf: session.csrf });
    } catch {
      fail(res, 401, 'Invalid credentials');
    }
  });

  app.post('/api/admin/logout', requireAdmin, async (req, res) => {
    try {
      const id = req.cookies?.[COOKIE];
      const storage = getStorage();
      await storage.writeSessions((await storage.readSessions()).filter(item => item.id !== id));
      res.clearCookie(COOKIE, { path: '/' });
      res.clearCookie(CSRF_COOKIE, { path: '/' });
      await audit(req.adminId || '', 'logout', 'admin', true);
      res.json({ ok: true });
    } catch { fail(res, 500, 'Something went wrong.'); }
  });

  app.get('/api/admin/content', requireAdmin, async (_req, res) => {
    try { res.json(await withResolvedMedia(await getStorage().readContent())); }
    catch { fail(res, 500, 'Something went wrong.'); }
  });

  app.put('/api/admin/content', writeLimit, requireAdmin, async (req, res) => {
    try {
      const content = contentSchema.parse(req.body);
      const saved = await getStorage().writeContent(content);
      await audit(req.adminId || '', 'content.update', 'content', true);
      res.json(await withResolvedMedia(saved));
    } catch (error) {
      if ((error as { name?: string }).name === 'ZodError') return fail(res, 400, 'The submitted content was not valid.');
      console.error('content write failed:', (error as Error).message);
      fail(res, 500, 'Something went wrong.');
    }
  });

  app.post('/api/admin/password', loginLimit, requireAdmin, async (req, res) => {
    try {
      const body = passwordChangeSchema.parse(req.body);
      const storage = getStorage();
      const auth = await storage.readAuth();
      if (!auth || !(await bcrypt.compare(body.current, auth.passwordHash))) return fail(res, 401, 'Invalid credentials');
      await storage.writeAuth({ ...auth, passwordHash: await bcrypt.hash(body.next, BCRYPT_ROUNDS), failed: 0, lockedUntil: 0 });
      const keep = req.cookies?.[COOKIE];
      await storage.writeSessions((await storage.readSessions()).filter(item => item.id === keep));
      await audit(auth.id, 'password.change', 'admin', true);
      res.json({ ok: true });
    } catch {
      fail(res, 400, 'Invalid credentials');
    }
  });

  app.get('/api/admin/audit', requireAdmin, async (_req, res) => {
    try { res.json(await getStorage().readAudit(80)); }
    catch { fail(res, 500, 'Something went wrong.'); }
  });

  app.post('/api/admin/upload', uploadLimit, requireAdmin, express.raw({ type: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], limit: MAX_UPLOAD }), async (req, res) => {
    try {
      const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);
      const record = await storeUpload(buffer);
      if (!record) return fail(res, 400, 'That file is not an allowed image.');
      await audit(req.adminId || '', 'upload', record.id, true);
      res.json({ id: record.id, url: record.url, type: record.contentType });
    } catch (error) {
      console.error('upload failed:', (error as Error).message);
      fail(res, 400, 'That file could not be uploaded.');
    }
  });

  app.delete('/api/admin/media/:id', writeLimit, requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '');
      if (!/^[\w-]+$/.test(id)) return fail(res, 400, 'Invalid file.');
      await removeUpload(id);
      await audit(req.adminId || '', 'upload.delete', id, true);
      res.json({ ok: true });
    } catch { fail(res, 500, 'Something went wrong.'); }
  });

  app.use('/api', (_req, res) => fail(res, 404, 'Not found.'));

  if (options.serveStatic) {
    const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
    app.use(express.static(dist, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error.message);
    if (!res.headersSent) fail(res, 500, 'Something went wrong.');
  });

  void sessionSecret();
  return app;
}
