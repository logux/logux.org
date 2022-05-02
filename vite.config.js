import { defineConfig } from 'vite'
import vitePluginPug from 'vite-plugin-pug-transformer'

import { DIST, SRC } from './scripts/lib/dirs.js'

export default defineConfig({
  root: SRC,
  build: {
    assetsInlineLimit: 0,
    emptyOutDir: true,
    outDir: DIST
  },
  plugins: [vitePluginPug()]
})
