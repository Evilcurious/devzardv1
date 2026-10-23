import type { Plugin } from 'vite';
import { createApp } from './app.ts';
import { bootstrapAdmin } from './bootstrap.ts';
import { getStorage } from './storage/index.ts';

let ready: Promise<void> | null = null;

function ensureReady() {
  if (!ready) ready = getStorage().init().then(() => bootstrapAdmin()).catch(error => {
    console.error('[devzard] storage init failed:', (error as Error).message);
  });
  return ready;
}

export function adminApiPlugin(): Plugin {
  const app = createApp();
  return {
    name: 'devzard-admin-api',
    async configureServer(server) {
      await ensureReady();
      server.middlewares.use(app);
    },
    async configurePreviewServer(server) {
      await ensureReady();
      server.middlewares.use(app);
    },
  };
}
