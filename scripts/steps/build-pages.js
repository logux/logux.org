import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import pug from 'pug'
import rehypeParse from 'rehype-parse'
import slugify from 'slugify'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

import { DIST, SRC } from '../lib/dirs.js'
import { markdownUrl, treeToMarkdown } from '../lib/markdown.js'
import wrap from '../lib/spinner.js'

const PAGES = ['branding']

function capitalize(str) {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase()
}

function findHeaders(tree) {
  let list = []
  visit(tree, 'element', node => {
    if (node.tagName === 'h2') {
      let text = node.children[0].value
      list.push({ link: '#' + slugify(text, { lower: true }), text })
    }
  })
  return list
}

async function buildPages(assets, layout) {
  await Promise.all(
    PAGES.map(async i => {
      let filename = join(SRC, `${i}.pug`)
      let template = await readFile(filename)
      let title = capitalize(i) + ' / '
      let inner = pug.render(template.toString(), { filename })
      let tree = await unified().use(rehypeParse).parse(inner)
      let submenu = findHeaders(tree)
      let mdUrl = markdownUrl(i)
      let markdown = await treeToMarkdown(tree, i)
      let html = await layout({
        categoryUrl: `/${i}/`,
        links: submenu,
        mdUrl,
        title,
        tree
      })
      let dest = join(DIST, i, 'index.html')
      let mdDest = join(DIST, mdUrl.slice(1))
      await Promise.all([writeFile(dest, html), writeFile(mdDest, markdown)])
      assets.add(dest)
      assets.add(mdDest, markdown)
    })
  )
}

export default wrap(buildPages, 'Building pages HTML')
