import { createApp } from './app';
import { bootstrapAdmin } from './bootstrap';
import { assertProductionConfig } from './env';
import { sessionSecret } from './secret';
import { getStorage } from './storage/index';

const port = Number(process.env.PORT || 4173);

assertProductionConfig();
await getStorage().init();
await bootstrapAdmin();
await sessionSecret();

const app = createApp({ serveStatic: true });
app.listen(port, () => {
  console.log(`Devzard listening on http://localhost:${port}`);
});
