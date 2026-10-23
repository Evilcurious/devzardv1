import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/app';
import { bootstrapAdmin } from '../server/bootstrap';
import { assertProductionConfig } from '../server/env';
import { sessionSecret } from '../server/secret';
import { getStorage } from '../server/storage';

/**
 * Vercel serverless entry for the Express API.
 *
 * `vercel.json` rewrites every `/api/*` request here while preserving the
 * original URL, so the app sees the same paths it handles in development. The
 * app is created once per instance and reused across warm invocations; storage
 * schema, the first admin seed and the session secret resolve once, on the
 * first request, and a failed boot is retried by the next one.
 */

type VercelRequest = IncomingMessage & { body?: unknown; _body?: boolean };

let ready: Promise<void> | null = null;

async function initialize() {
  assertProductionConfig();
  await getStorage().init();
  await bootstrapAdmin();
  await sessionSecret();
}

function ensureReady() {
  if (!ready) {
    ready = initialize().catch(error => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

const app = createApp({ serveStatic: false });

export default async function handler(req: VercelRequest, res: ServerResponse) {
  // Vercel's Node runtime may have already read and parsed the request body.
  // Express' body parsers (express.json / express.raw) skip parsing when
  // `req._body` is true, so flag it — otherwise Express would read an already
  // consumed stream and every POST/PUT would arrive with an empty body.
  if (req.body !== undefined) req._body = true;

  // If a rewrite ever hands over a path without the /api prefix, restore it.
  const url = req.url ?? '/';
  if (!url.startsWith('/api')) req.url = `/api${url.startsWith('/') ? '' : '/'}${url}`;

  await ensureReady();
  return app(req, res);
}
