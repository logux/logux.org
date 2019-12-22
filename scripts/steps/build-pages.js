import { promises as fs } from 'fs'
import rehypeParse from 'rehype-parse'
import capitalize from 'capitalize'
import { join } from 'path'
import unified from 'unified'
import pug from 'pug'

import wrap from '../lib/spinner.js'
import { SRC, DIST } from '../lib/dirs.js'

const PAGES = ['branding']

async function buildPages (assets, layout) {
  await PAGES.map(async i => {
    let filename = join(SRC, `${ i }.pug`)
    let template = await fs.readFile(filename)
    let title = capitalize(i)
    let inner = pug.render(template.toString(), { filename })
    let tree = await unified().use(rehypeParse).parse(inner)
    let html = await layout(`/${ i }/`, [], title, tree)
    let dest = join(DIST, i, 'index.html')
    await fs.writeFile(dest, html)
    assets.add(dest)
  })
}

export default wrap(buildPages, 'Building pages HTML')
