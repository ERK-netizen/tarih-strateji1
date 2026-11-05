import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      '@ts/engine': r('./packages/engine/src/index.ts'),
      '@ts/protocol': r('./packages/protocol/src/index.ts'),
      '@ts/command': r('./packages/command/src/index.ts'),
      '@ts/storage': r('./packages/storage/src/index.ts'),
    },
  },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60000 },
});
