import { promises as fs } from 'fs'
import combineMedia from 'postcss-combine-media-query'
import postcssUrl from 'postcss-url'
import postcss from 'postcss'

import wrap from '../lib/spinner.js'

async function repackStyles (assets) {
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
  let processor = postcss([fileCollector, combineMedia])
  await Promise.all(assets.get(/\.css$/).map(async file => {
    let css = await fs.readFile(file)
    let result = await processor.process(css, { from: file })
    await fs.writeFile(file, result.css)
  }))
  return collected
}

export default wrap(repackStyles, 'Repacking media queries')
