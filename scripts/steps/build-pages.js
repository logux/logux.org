import { promises as fs } from 'fs'
import rehypeParse from 'rehype-parse'
import unistVisit from 'unist-util-visit'
import capitalize from 'capitalize'
import { join } from 'path'
import slugify from 'slugify'
import unified from 'unified'
import pug from 'pug'

import wrap from '../lib/spinner.js'
import { SRC, DIST } from '../lib/dirs.js'

const PAGES = ['branding']

function findHeaders (tree) {
  let list = []
  unistVisit(tree, 'element', node => {
    if (node.tagName === 'h2') {
      let text = node.children[0].value
      list.push({ text, link: '#' + slugify(text, { lower: true }) })
    }
  })
  return list
}

async function buildPages (assets, layout) {
  await PAGES.map(async i => {
    let filename = join(SRC, `${ i }.pug`)
    let template = await fs.readFile(filename)
    let title = capitalize(i)
    let inner = pug.render(template.toString(), { filename })
    let tree = await unified().use(rehypeParse).parse(inner)
    let submenu = findHeaders(tree)
    let html = await layout(`/${ i }/`, submenu, title, tree)
    let dest = join(DIST, i, 'index.html')
    await fs.writeFile(dest, html)
    assets.add(dest)
  })
}

export default wrap(buildPages, 'Building pages HTML')
