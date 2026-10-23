import { createApp } from './app.ts';
import { bootstrapAdmin } from './bootstrap.ts';
import { assertProductionConfig } from './env.ts';
import { sessionSecret } from './secret.ts';
import { getStorage } from './storage/index.ts';

const port = Number(process.env.PORT || 4173);

assertProductionConfig();
await getStorage().init();
await bootstrapAdmin();
await sessionSecret();

const app = createApp({ serveStatic: true });
app.listen(port, () => {
  console.log(`Devzard listening on http://localhost:${port}`);
});
