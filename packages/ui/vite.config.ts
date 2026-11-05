import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const tek = process.env.TEK_DOSYA === '1';

export default defineConfig({
  root: r('.'),
  base: './',
  plugins: [preact(), ...(tek ? [viteSingleFile()] : [])],
  resolve: {
    alias: {
      '@ts/engine': r('../engine/src/index.ts'),
      '@ts/protocol': r('../protocol/src/index.ts'),
      '@ts/command': r('../command/src/index.ts'),
      '@ts/storage': r('../storage/src/index.ts'),
      '@ts/map': r('../map/src/index.ts'),
    },
  },
  worker: { format: 'es' },
  build: {
    outDir: tek ? r('../../dist-tek') : r('dist'),
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: tek ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 4000,
  },
  server: { host: true },
});
