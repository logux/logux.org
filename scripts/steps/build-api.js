let { join, dirname } = require('path')
let { writeFile } = require('fs').promises
let makeDir = require('make-dir')

const DIST = join(__dirname, '..', '..', 'dist')

function tag (tagName, children) {
  if (typeof children === 'string') {
    children = [{ type: 'text', value: children }]
  }
  return { type: 'element', tagName, properties: { }, children }
}

function toTree (title) {
  return {
    type: 'root',
    children: [
      tag('h1', title)
    ]
  }
}

module.exports = async function buildApi (assets, layout, file, title, jsdoc) {
  let path = join(DIST, file, 'index.html')
  await makeDir(dirname(path))
  let tree = toTree(title, jsdoc)
  let html = await layout.api(title, tree)
  await writeFile(path, html)
  assets.add(path)
}
