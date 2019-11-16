let { join, dirname } = require('path')
let { writeFile } = require('fs').promises
let capitalize = require('capitalize')
let makeDir = require('make-dir')

let wrap = require('../lib/spinner')

const DIST = join(__dirname, '..', '..', 'dist')

async function buildGuides (assets, layout, guides) {
  await Promise.all(guides.map(async page => {
    let title = `${ page.title } / ${ capitalize(dirname(page.file)) }`
    let html = await layout.guide(title, page.tree)
    let path = join(DIST, join(page.file.replace(/\.md$/, ''), 'index.html'))
    await makeDir(dirname(path))
    await writeFile(path, html)
    assets.add(path)
  }))
}

module.exports = wrap(buildGuides, 'Building guides HTML')
