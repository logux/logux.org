import { defineConfig } from 'vite'
import vitePluginPug from 'vite-plugin-pug-transformer'

import { DIST, SRC } from './scripts/lib/dirs.js'

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    // Vite 8 minifies CSS by Lightning CSS, which converts media queries
    // to the range syntax. Keep the oldest browsers from `browserslist`.
    cssTarget: ['chrome104', 'edge104', 'firefox102', 'safari15.6'],
    emptyOutDir: true,
    outDir: DIST
  },
  plugins: [vitePluginPug()],
  root: SRC
})
