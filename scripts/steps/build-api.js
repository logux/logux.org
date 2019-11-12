let { join, dirname } = require('path')
let { writeFile } = require('fs').promises
let makeDir = require('make-dir')

const DIST = join(__dirname, '..', '..', 'dist')

function toTree () {
  return { type: 'root', children: [] }
}

module.exports = async function buildApi (assets, layout, file, title, jsdoc) {
  let path = join(DIST, file, 'index.html')
  await makeDir(dirname(path))
  let html = await layout.api(file, title, toTree(jsdoc))
  await writeFile(path, html)
  assets.add(path)
}
