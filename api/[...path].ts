import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/app.ts';
import { bootstrapAdmin } from '../server/bootstrap.ts';
import { assertProductionConfig } from '../server/env.ts';
import { sessionSecret } from '../server/secret.ts';
import { getStorage } from '../server/storage/index.ts';

/**
 * Vercel serverless entry for the Express API — every request under `/api/*`.
 *
 * The app is created once per function instance and reused across warm
 * invocations. Storage schema, the first admin seed and the session secret are
 * resolved once, on the first request, so a cold start pays for them a single
 * time and a failed boot is retried by the next request.
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
  await ensureReady();
  return app(req, res);
}
