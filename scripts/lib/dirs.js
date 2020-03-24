import { dirname, join } from 'path'

let self = new URL(import.meta.url).pathname

export const ROOT = join(dirname(self), '..', '..')
export const NODE_MODULES = join(ROOT, 'node_modules')
export const PROJECTS = join(ROOT, '..')
export const WORKERS = join(ROOT, 'scripts', 'workers')
export const DIST = join(ROOT, 'dist')
export const SRC = join(ROOT, 'src')
