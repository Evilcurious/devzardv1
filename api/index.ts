import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Vercel serverless entry for the Express API.
 *
 * `vercel.json` rewrites every `/api/*` request here while preserving the
 * original URL, so the app sees the same paths it handles in development.
 *
 * The app is loaded lazily and created once per instance, then reused across
 * warm invocations. Pulling it in through a dynamic import means a failure
 * while booting (missing config, unreachable storage) surfaces as a readable
 * JSON error instead of an opaque FUNCTION_INVOCATION_FAILED page.
 */

type VercelRequest = IncomingMessage & { body?: unknown; _body?: boolean };
type Handler = (req: IncomingMessage, res: ServerResponse) => unknown;

let booting: Promise<Handler> | null = null;

async function boot(): Promise<Handler> {
  const [{ createApp }, { assertProductionConfig }, { getStorage }, { bootstrapAdmin }, { sessionSecret }] =
    await Promise.all([
      import('../server/app'),
      import('../server/env'),
      import('../server/storage'),
      import('../server/bootstrap'),
      import('../server/secret'),
    ]);

  assertProductionConfig();
  await getStorage().init();
  await bootstrapAdmin();
  await sessionSecret();

  return createApp({ serveStatic: false }) as unknown as Handler;
}

function describe(error: unknown) {
  const value = error as { message?: string; code?: string; stack?: string; cause?: unknown };
  const cause = value?.cause as { message?: string; code?: string } | undefined;
  return {
    message: value?.message ?? String(error),
    code: value?.code,
    cause: cause ? { message: cause.message, code: cause.code } : undefined,
    stack: value?.stack?.split('\n').slice(0, 6),
  };
}

export default async function handler(req: VercelRequest, res: ServerResponse) {
  // If a rewrite ever hands over a path without the /api prefix, restore it.
  const url = req.url ?? '/';
  if (!url.startsWith('/api')) req.url = `/api${url.startsWith('/') ? '' : '/'}${url}`;

  // Vercel's Node runtime may have already read and parsed the request body.
  // Express' body parsers (express.json / express.raw) skip parsing when
  // `req._body` is true, so flag it — otherwise Express would read an already
  // consumed stream and every POST/PUT would arrive with an empty body.
  if (req.body !== undefined) req._body = true;

  if (!booting) {
    booting = boot().catch(error => {
      booting = null;
      throw error;
    });
  }

  let app: Handler;
  try {
    app = await booting;
  } catch (error) {
    console.error('[devzard] api boot failed', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({ error: 'api_boot_failed', detail: describe(error) }));
    return;
  }

  return app(req, res);
}
