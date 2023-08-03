import { readFile, unlink, writeFile } from 'fs/promises'
import makeDir from 'make-dir'
import { extname, join } from 'path'
import rehypeParse from 'rehype-parse'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'
import unistFlatmap from 'unist-util-flatmap'

import { DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

const PRELOAD_TYPES = {
  '.svg': 'image',
  '.woff2': 'font'
}

function tag(tagName, properties) {
  return { children: [], properties, tagName, type: 'element' }
}

async function updateHtml(assets, manifest, preloadFiles) {
  let [html] = await Promise.all([
    readFile(join(DIST, 'index.html')),
    makeDir(join(DIST, 'uikit'))
  ])
  function optimizer() {
    return tree =>
      unistFlatmap(tree, node => {
        let props = node.properties || {}
        if (props.rel && props.rel[0] === 'icon' && props.sizes) {
          return [
            tag('link', { href: '/favicon.ico', rel: 'icon', sizes: 'any' }),
            node
          ]
        } else if (props.name === 'apple-mobile-web-app-title') {
          return [
            node,
            tag('link', { href: manifest.url, rel: 'manifest' }),
            tag('meta', { content: manifest.theme, name: 'theme-color' })
          ].concat(
            preloadFiles.map(([media, url]) => {
              let as = PRELOAD_TYPES[extname(url)]
              if (!as) throw new Error('Unknown type ' + extname(url))
              return tag('link', {
                as,
                crossorigin: as === 'font',
                href: url,
                media,
                rel: 'preload'
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
  let oldFile = join(DIST, 'index.html')
  let newFile = join(DIST, 'uikit', 'index.html')
  await Promise.all([writeFile(newFile, String(fixed)), unlink(oldFile)])
  assets.remove(oldFile)
  assets.add(newFile)
  return String(fixed)
}

export default wrap(updateHtml, 'Updating HTML layout')
