let { join, dirname, sep } = require('path')
let { writeFile } = require('fs').promises
let remarkRehype = require('remark-rehype')
let unistVisit = require('unist-util-visit')
let slugify = require('slugify')
let makeDir = require('make-dir')

const DIST = join(__dirname, '..', '..', 'dist')
const SIMPLE_TYPES = {
  string: true, object: true, function: true, boolean: true, number: true
}

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

function getEditUrl (file) {
  if (sep !== '\\') file = file.replace(/\\/g, '/')
  let [, name, path] = file.match(/^.*\/logux-([^/]+)\/(.*)/)
  return `https://github.com/logux/${ name }/edit/master/${ path }`
}

function typeHtml (type) {
  if (type.type === 'UnionType') {
    return type.elements.flatMap((el, i) => {
      if (i === type.elements.length - 1) {
        return typeHtml(el)
      } else {
        return [...typeHtml(el), { type: 'text', value: ' | ' }]
      }
    })
  } else if (type.type === 'OptionalType') {
    if (type.expression.type === 'UnionType') {
      return [
        { type: 'text', value: '(' },
        ...typeHtml(type.expression),
        { type: 'text', value: ')?' }
      ]
    } else {
      return [...typeHtml(type.expression), { type: 'text', value: '?' }]
    }
  } else if (type.type === 'StringLiteralType') {
    return [{ type: 'text', value: `"${ type.value }"` }]
  } else if (SIMPLE_TYPES[type.name]) {
    return [{ type: 'text', value: type.name }]
  } else {
    let href = '#' + slugify(type.name, { lower: true })
    if (type.name === 'http.Server') {
      href = 'https://nodejs.org/api/http.html#http_class_http_server'
    }
    return [tag('a', type.name, { properties: { href } })]
  }
}

function paramsHtml (params) {
  if (params.length === 0) return []
  let table = tag('table', [
    tag('tr', [
      tag('th', 'Parameter'),
      tag('th', 'Type'),
      tag('th', 'description')
    ]),
    ...params.map(i => tag('tr', [
      tag('td', [
        tag('code', i.name)
      ]),
      tag('td', [
        tag('code', typeHtml(i.type), { noClass: true })
      ]),
      tag('td', i.description)
    ]))
  ])
  return [table]
}

function classHtml (cls) {
  return tag('article', [
    tag('h1', cls.name, {
      editUrl: getEditUrl(cls.context.file)
    }),
    ...toHtml(cls.description),
    ...paramsHtml(cls.tags.filter(i => i.title === 'param'))
  ])
}

function toTree (jsdoc) {
  return {
    type: 'root',
    children: jsdoc
      .filter(i => i.kind === 'class')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(classHtml)
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
