import { join } from 'path'
import Bundler from 'parcel-bundler'

import { SRC } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

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
  return {
    get (regexp) {
      return assets.filter(i => regexp.test(i))
    },
    find (regexp) {
      return assets.find(i => regexp.test(i))
    },
    remove (path) {
      assets = assets.filter(i => i !== path)
    },
    add (path) {
      assets = assets.concat([path])
    }
  }
}

export default wrap(compileAssets, 'Compiling assets')
