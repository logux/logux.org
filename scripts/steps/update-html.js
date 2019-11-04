let { writeFile, readFile, unlink } = require('fs').promises
let { extname, join } = require('path')
let posthtml = require('posthtml')
let makeDir = require('make-dir')

const DIST = join(__dirname, '..', '..', 'dist')
const PRELOAD_TYPES = {
  '.woff2': 'font',
  '.svg': 'image'
}

module.exports = async function updateHtml (assets, manifest, preloadFiles) {
  let [html] = await Promise.all([
    readFile(join(DIST, 'uikit.html')),
    makeDir(join(DIST, 'uikit'))
  ])
  function htmlPlugin (tree) {
    tree.match({ attrs: { rel: 'icon', sizes: '512x512' } }, () => {
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: manifest.url } },
        { tag: 'meta', attrs: { name: 'theme-color', content: manifest.theme } }
      ].concat(preloadFiles.map(([media, url]) => {
        let as = PRELOAD_TYPES[extname(url)]
        if (!as) throw new Error('Unknown type ' + extname(url))
        return {
          tag: 'link',
          attrs: {
            rel: 'preload', href: url, as, media, crossorigin: as === 'font'
          }
        }
      }))
    })
  }
  let fixed = posthtml().use(htmlPlugin).process(html, { sync: true }).html
  let oldFile = join(DIST, 'uikit.html')
  let newFile = join(DIST, 'uikit', 'index.html')
  await Promise.all([
    writeFile(newFile, fixed),
    unlink(oldFile)
  ])
  assets.remove(oldFile)
  assets.add(newFile)
}
