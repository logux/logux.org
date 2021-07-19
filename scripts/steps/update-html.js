import { readFile, writeFile, unlink } from 'fs/promises'
import { extname, join } from 'path'
import rehypeStringify from 'rehype-stringify'
import unistFlatmap from 'unist-util-flatmap'
import rehypeParse from 'rehype-parse'
import unified from 'unified'
import makeDir from 'make-dir'

import { DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

const PRELOAD_TYPES = {
  '.woff2': 'font',
  '.svg': 'image'
}

function tag(tagName, properties) {
  return { type: 'element', tagName, properties, children: [] }
}

async function updateHtml(assets, manifest, preloadFiles) {
  let [html] = await Promise.all([
    readFile(join(DIST, 'uikit.html')),
    makeDir(join(DIST, 'uikit'))
  ])
  function optimizer() {
    return tree =>
      unistFlatmap(tree, node => {
        let props = node.properties || {}
        if (props.rel && props.rel[0] === 'icon' && props.sizes) {
          return [
            tag('link', { rel: 'icon', sizes: 'any', href: '/favicon.ico' }),
            node
          ]
        } else if (props.name === 'apple-mobile-web-app-title') {
          return [
            node,
            tag('link', { rel: 'manifest', href: manifest.url }),
            tag('meta', { name: 'theme-color', content: manifest.theme })
          ].concat(
            preloadFiles.map(([media, url]) => {
              let as = PRELOAD_TYPES[extname(url)]
              if (!as) throw new Error('Unknown type ' + extname(url))
              return tag('link', {
                rel: 'preload',
                href: url,
                as,
                media,
                crossorigin: as === 'font'
              })
            })
          )
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
  await Promise.all([writeFile(newFile, fixed.contents), unlink(oldFile)])
  assets.remove(oldFile)
  assets.add(newFile)
  return fixed.contents
}

export default wrap(updateHtml, 'Updating HTML layout')
