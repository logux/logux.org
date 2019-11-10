let { writeFile, readFile, unlink } = require('fs').promises
let { extname, join } = require('path')
let rehypeStringify = require('rehype-stringify')
let unistFlatmap = require('unist-util-flatmap')
let rehypeParse = require('rehype-parse')
let unified = require('unified')
let makeDir = require('make-dir')

const DIST = join(__dirname, '..', '..', 'dist')
const PRELOAD_TYPES = {
  '.woff2': 'font',
  '.svg': 'image'
}

function tag (tagName, properties) {
  return { type: 'element', tagName, properties, children: [] }
}

module.exports = async function updateHtml (assets, manifest, preloadFiles) {
  let [html] = await Promise.all([
    readFile(join(DIST, 'uikit.html')),
    makeDir(join(DIST, 'uikit'))
  ])
  function optimizer () {
    return tree => unistFlatmap(tree, node => {
      let props = node.properties || { }
      if (props.rel && props.rel[0] === 'icon' && props.sizes === '512x512') {
        return [
          tag('link', { rel: 'manifest', href: manifest.url }),
          tag('meta', { name: 'theme-color', content: manifest.theme })
        ].concat(preloadFiles.map(([media, url]) => {
          let as = PRELOAD_TYPES[extname(url)]
          if (!as) throw new Error('Unknown type ' + extname(url))
          return tag('link', {
            rel: 'preload', href: url, as, media, crossorigin: as === 'font'
          })
        }))
      } else {
        return [node]
      }
    })
  }
  let fixed = await unified()
    .use(rehypeParse)
    .use(optimizer)
    .use(rehypeStringify)
    .process(html)
  let oldFile = join(DIST, 'uikit.html')
  let newFile = join(DIST, 'uikit', 'index.html')
  await Promise.all([
    writeFile(newFile, fixed.contents),
    unlink(oldFile)
  ])
  assets.remove(oldFile)
  assets.add(newFile)
  return fixed.contents
}
