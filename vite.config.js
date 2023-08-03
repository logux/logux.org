import { defineConfig } from 'vite'
import vitePluginPug from 'vite-plugin-pug-transformer'

import { DIST, SRC } from './scripts/lib/dirs.js'

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    emptyOutDir: true,
    outDir: DIST
  },
  plugins: [vitePluginPug()],
  root: SRC
})
