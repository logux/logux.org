let { join, dirname } = require('path')
let { writeFile } = require('fs').promises
let remarkRehype = require('remark-rehype')
let unistVisit = require('unist-util-visit')
let makeDir = require('make-dir')

const DIST = join(__dirname, '..', '..', 'dist')

function tag (tagName, children, opts) {
  if (typeof children === 'string') {
    children = [{ type: 'text', value: children }]
  }
  return { type: 'element', tagName, properties: { }, children, ...opts }
}

function toHtml (tree) {
  unistVisit(tree, 'link', node => {
    if (/^\w+$/.test(node.url)) {
      node.url = '#' + node.url.toLowerCase()
    }
  })
  return remarkRehype()(tree).children
}

function toTree (jsdoc) {
  return {
    type: 'root',
    children: jsdoc
      .filter(i => i.kind === 'class')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(cls => {
        let [, name, file] = cls.context.file.match(/^.*\/logux-([^/]+)\/(.*)/)
        return tag('article', [
          tag('h1', cls.name, {
            editUrl: `https://github.com/logux/${ name }/edit/master/${ file }`
          }),
          ...toHtml(cls.description)
        ])
      })
  }
}

module.exports = async function buildApi (
  spin, assets, layout, file, title, jsdoc
) {
  spin.add('build-api', { text: 'Building API HTML' })
  let path = join(DIST, file, 'index.html')
  await makeDir(dirname(path))
  let tree = toTree(jsdoc)
  let html = await layout.api(title, tree)
  await writeFile(path, html)
  assets.add(path)
  spin.succeed('build-api', { text: 'API HTML generated' })
}
