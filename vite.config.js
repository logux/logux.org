import { defineConfig } from 'vite'

import { DIST, SRC } from "./scripts/lib/dirs.js";
import vitePluginPug from "./scripts/lib/vite-plugin-pug.js";

export default defineConfig({
  root: SRC,
  build: {
    assetsInlineLimit: 0,
    outDir: DIST,
  },
  plugins: [vitePluginPug()],
})
