// Bundles the Express API into a single ESM file at api/index.js.
//
// Vercel's Node runtime executes api/* as native ESM (package.json type is
// "module") and does not transpile the TypeScript modules that the entry
// imports, so shipping server/*.ts as-is fails at runtime with
// ERR_MODULE_NOT_FOUND. Bundling ahead of deployment keeps the deployed
// artifact a single self-contained file with no TypeScript left to resolve.
import { build } from 'esbuild';

await build({
  entryPoints: ['server/entry.ts'],
  outfile: 'api/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: false,
  logLevel: 'info',
  // ESM output has no `require`, but several dependencies (express and
  // friends) are CommonJS and call it at runtime.
  banner: {
    js: [
      "import { createRequire as __dzCreateRequire } from 'node:module';",
      'const require = __dzCreateRequire(import.meta.url);',
    ].join('\n'),
  },
  // Optional native / binary add-ons that must never be bundled. They are
  // guarded by try/catch or feature detection inside their libraries.
  external: ['pg-native', 'bufferutil', 'utf-8-validate', 'canvas'],
});
