import parcelCore from '@parcel/core'
import { globby } from 'globby'
import { join } from 'path'

import { SRC, ROOT, DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'
import hash from '../lib/hash.js'

let Parcel = parcelCore.default

async function compileAssets() {
  let pugTemplate = join(SRC, 'uikit.pug')
  let bundler = new Parcel({
    entries: pugTemplate,
    shouldPatchConsole: false,
    defaultConfig: join(ROOT, 'node_modules', '@parcel', 'config-default'),
    mode: 'production',
    defaultTargetOptions: {
      sourceMaps: false
    }
  })
  await bundler.run()
  let assets = await globby(join(DIST, '*'))
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
