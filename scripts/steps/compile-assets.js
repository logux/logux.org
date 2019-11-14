let { join } = require('path')
let Bundler = require('parcel-bundler')

module.exports = async function compileAssets () {
  let pugTemplate = join(__dirname, '..', '..', 'src', 'uikit.pug')
  let uikitBundler = new Bundler(pugTemplate, {
    sourceMaps: false,
    logLevel: 2
  })
  let bundle = await uikitBundler.bundle()
  function findAssets (step) {
    return Array.from(step.childBundles).reduce((all, i) => {
      return all.concat(findAssets(i))
    }, [step.name])
  }
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
