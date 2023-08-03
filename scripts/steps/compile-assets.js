import glob from 'fast-glob'
import { join } from 'path'
import { build } from 'vite'

import { DIST } from '../lib/dirs.js'
import hash from '../lib/hash.js'
import wrap from '../lib/spinner.js'

async function compileAssets() {
  await build({
    logLevel: 'warn'
  })

  let assets = await glob(join(DIST, '*'))
  let hashes = {}
  return {
    add(path, content) {
      if (content) {
        hashes[path] = hash(content)
      }
      assets = assets.concat([path])
    },
    find(regexp) {
      return assets.find(i => regexp.test(i))
    },
    get(regexp) {
      return assets.filter(i => regexp.test(i))
    },
    hash(path) {
      return hashes[path]
    },
    map(fn) {
      return assets.map(fn)
    },
    remove(path) {
      assets = assets.filter(i => i !== path)
    }
  }
}

export default wrap(compileAssets, 'Compiling assets')
