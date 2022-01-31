import vite from 'vite'
import { join } from 'path'
import glob from 'fast-glob'

import { DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'
import hash from '../lib/hash.js'

async function compileAssets() {
  await vite.build()

  let assets = await glob(join(DIST, '*'))
  let hashes = {}
  return {
    map(fn) {
      return assets.map(fn)
    },
    get(regexp) {
      return assets.filter(i => regexp.test(i))
    },
    find(regexp) {
      return assets.find(i => regexp.test(i))
    },
    remove(path) {
      assets = assets.filter(i => i !== path)
    },
    add(path, content) {
      if (content) {
        hashes[path] = hash(content)
      }
      assets = assets.concat([path])
    },
    hash(path) {
      return hashes[path]
    }
  }
}

export default wrap(compileAssets, 'Compiling assets')
