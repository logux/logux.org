import { join, dirname, sep } from 'path'
import { promises as fs } from 'fs'
import capitalize from 'capitalize'
import makeDir from 'make-dir'

import { DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

function dirToTitle (dir) {
  return capitalize(dir)
    .replace(/-\w/, i => ' ' + i.slice(1).toUpperCase())
    .replace('Ws', 'Web Socket')
    .replace('Backend', 'Back-end')
}

async function buildDocs (assets, layout, guides) {
  await Promise.all(guides.map(async page => {
    let title, categoryUrl
    let dirs = join(page.file.replace(/\.md$/, ''))
    if (dirname(page.file) === 'recipes') {
      categoryUrl = '/recipes/authentication/'
    } else if (dirname(dirname(page.file)) === 'protocols') {
      categoryUrl = '/protocols/ws/spec/'
    } else {
      categoryUrl = '/guide/architecture/core/'
    }
    title = dirs.split(sep).reverse().map(i => dirToTitle(i)).join(' / ')
    let html = await layout.doc(categoryUrl, [], title, page.tree)
    let path = join(DIST, dirs, 'index.html')
    await makeDir(dirname(path))
    await fs.writeFile(path, html)
    assets.add(path)
  }))
}

export default wrap(buildDocs, 'Building docs HTML')
