import { createApp } from '../server/app.ts';
import { bootstrapAdmin } from '../server/bootstrap.ts';
import { assertProductionConfig } from '../server/env.ts';
import { sessionSecret } from '../server/secret.ts';
import { getStorage } from '../server/storage/index.ts';

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

export default async function handler(req: any, res: any) {
  await ensureReady();
  return app(req, res);
}