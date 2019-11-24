let { join, dirname, sep } = require('path')
let { writeFile } = require('fs').promises
let capitalize = require('capitalize')
let makeDir = require('make-dir')

let wrap = require('../lib/spinner')

const DIST = join(__dirname, '..', '..', 'dist')

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
    await writeFile(path, html)
    assets.add(path)
  }))
}

module.exports = wrap(buildDocs, 'Building docs HTML')
