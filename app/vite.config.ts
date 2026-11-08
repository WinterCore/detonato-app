import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  // Declared in src/env.d.ts.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), tailwindcss()],
  // The one bundle carries Posy's whole sheet (core/segments/glyphs.json, ~190 kB of SVG paths): every
  // screen draws from it, and the app loads from the phone, not the network.
  build: { chunkSizeWarningLimit: 700 },
  // `pnpm dev`'s port. Strict: a dev server that wandered to another port would leave a phone in live reload
  // loading nothing.
  server: { port: 5190, strictPort: true },
  // `@/ui`, `@/core/...`: absolute imports from src (mirrored in tsconfig.app.json › paths).
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    // Unit tests only; e2e/ is Playwright's (`pnpm e2e`).
    include: ['src/**/*.test.ts'],
    // A zone with DST, so day math meets 23- and 25-hour days in every run.
    env: { TZ: 'America/New_York' },
  },
})
