let { readFile } = require('fs').promises
let postcssUrl = require('postcss-url')
let postcss = require('postcss')

let wrap = require('../lib/spinner')

async function findFilesInCSS (assets) {
  let collected = []
  let fileCollector = postcssUrl({
    url ({ url }, dir, ops, decl) {
      let media = decl.parent.parent
      let rule = decl.parent
      if (media && media.name === 'media') {
        if (!rule.selector.includes('html.is-dark')) {
          collected.push([media.params, url])
        }
      } else {
        collected.push([undefined, url])
      }
      return url
    }
  })
  await Promise.all(assets.get(/\.css$/).map(async file => {
    let css = await readFile(file)
    await postcss([fileCollector]).process(css, { from: file })
  }))
  return collected
}

module.exports = wrap(findFilesInCSS, 'Generating preload list')
