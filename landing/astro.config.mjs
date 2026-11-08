import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// The landing page: a static site, Tailwind v4 through its Vite plugin.
export default defineConfig({
  site: 'https://detonato.wintercore.xyz',
  server: { port: 5191 },
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
})
