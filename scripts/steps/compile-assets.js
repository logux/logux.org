import { join } from 'path'
import Bundler from 'parcel-bundler'

import { SRC } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'
import hash from '../lib/hash.js'

function findAssets (step) {
  return Array.from(step.childBundles).reduce((all, i) => {
    return all.concat(findAssets(i))
  }, [step.name])
}

async function compileAssets () {
  let pugTemplate = join(SRC, 'uikit.pug')
  let uikitBundler = new Bundler(pugTemplate, {
    sourceMaps: false,
    logLevel: 2
  })
  let bundle = await uikitBundler.bundle()
  let assets = findAssets(bundle)
  let hashes = { }
  return {
    map (fn) {
      return assets.map(fn)
    },
    get (regexp) {
      return assets.filter(i => regexp.test(i))
    },
    find (regexp) {
      return assets.find(i => regexp.test(i))
    },
    remove (path) {
      assets = assets.filter(i => i !== path)
    },
    add (path, content) {
      if (content) {
        hashes[path] = hash(content)
      }
      assets = assets.concat([path])
    },
    hash (path) {
      return hashes[path]
    }
  }
}

export default wrap(compileAssets, 'Compiling assets')
