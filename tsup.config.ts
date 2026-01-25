import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  // Mark native modules as external - they can't be bundled
  external: ['faiss-node'],
})
