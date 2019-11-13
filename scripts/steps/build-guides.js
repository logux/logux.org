let { join, dirname } = require('path')
let { writeFile } = require('fs').promises
let capitalize = require('capitalize')
let makeDir = require('make-dir')

const DIST = join(__dirname, '..', '..', 'dist')

module.exports = async function buildGuides (spin, assets, layout, guides) {
  spin.add('build-pages', { text: 'Building guides HTML' })
  await Promise.all(guides.map(async page => {
    let title = `${ page.title } / ${ capitalize(dirname(page.file)) }`
    let html = await layout.guide(title, page.tree)
    let path = join(DIST, join(page.file.replace(/\.md$/, ''), 'index.html'))
    await makeDir(dirname(path))
    await writeFile(path, html)
    assets.add(path)
  }))
  spin.succeed('build-pages', { text: 'Guides HTML generated' })
}
