import { promises as fs } from 'fs'
import postcssUrl from 'postcss-url'
import postcss from 'postcss'

import wrap from '../lib/spinner.js'

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
    let css = await fs.readFile(file)
    await postcss([fileCollector]).process(css, { from: file })
  }))
  return collected
}

export default wrap(findFilesInCSS, 'Generating preload list')
