let { join, dirname, sep } = require('path')
let createFormatters = require('documentation/src/output/util/formatters')
let { writeFile } = require('fs').promises
let remarkRehype = require('remark-rehype')
let unistVisit = require('unist-util-visit')
let lowlight = require('lowlight')
let makeDir = require('make-dir')
let slugify = require('slugify')
let remark = require('remark')

const DIST = join(__dirname, '..', '..', 'dist')
const SIMPLE_TYPES = {
  string: true, object: true, function: true, boolean: true, number: true
}

let formatters = createFormatters()

function tag (tagName, children, opts) {
  if (typeof children === 'string') {
    children = [{ type: 'text', value: children }]
  }
  return { type: 'element', tagName, properties: { }, children, ...opts }
}

function descToHtml (desc) {
  if (desc.type === 'root') {
    return toHtml(desc)
  } else {
    let md = desc.replace(/\{@link ([\w]+)}/, '[$1]($1)')
    return toHtml(remark().parse(md))
  }
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
  } else if (type.type === 'UndefinedLiteral') {
    return [{ type: 'text', value: 'undefined' }]
  } else if (type.type === 'TypeApplication') {
    return [
      { type: 'text', value: type.expression.name + '<' },
      ...typeHtml(type.applications[0]),
      { type: 'text', value: '>' }
    ]
  } else if (type.type === 'BooleanLiteralType') {
    return [{ type: 'text', value: type.value.toString() }]
  } else if (SIMPLE_TYPES[type.name]) {
    return [{ type: 'text', value: type.name }]
  } else if (type.type === 'NameExpression') {
    let href = '#' + slugify(type.name, { lower: true })
    if (type.name === 'http.Server') {
      href = 'https://nodejs.org/api/http.html#http_class_http_server'
    }
    return [tag('a', type.name, { properties: { href } })]
  } else {
    console.error(type)
    throw new Error(`Unknown type ${ type.type }`)
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
      tag('td', descToHtml(i.description))
    ]))
  ])
  return [table]
}

function returnsHtml (returns) {
  if (!returns) return []
  if (returns.type.type === 'UndefinedLiteral') return []
  let p = tag('p', [
    { type: 'text', value: 'Returns ' },
    tag('code', typeHtml(returns.type), { noClass: true }),
    { type: 'text', value: '. ' },
    ...toHtml(returns.description)[0].children
  ])
  return [p]
}

function exampleHtml (example) {
  if (!example) return []
  let pre = tag('pre', [
    tag('code', lowlight.highlight('js', example.description).value)
  ])
  return [pre]
}

function staticHtml (className, members) {
  return members.flatMap(member => {
    let name = [
      tag('span', className + '.', {
        properties: { className: ['title_extra'] }
      }),
      { type: 'text', value: member.name }
    ]
    if (member.kind === 'function') {
      name.push(tag('span', formatters.parameters(member, true), {
        properties: { className: ['title_extra'] }
      }))
    }
    return [
      tag('h2', [tag('code', name, { noClass: true })], {
        slug: (className + '.' + member.name).toLowerCase()
      }),
      ...toHtml(member.description),
      ...paramsHtml(member.params),
      ...returnsHtml(member.returns[0]),
      ...exampleHtml(member.examples[0])
    ]
  })
}

function instanceHtml (className, members) {
  return members.flatMap(member => {
    let name = [
      tag('span', className + '#', {
        properties: { className: ['title_extra'] }
      }),
      { type: 'text', value: member.name }
    ]
    if (member.kind === 'function') {
      name.push(tag('span', formatters.parameters(member, true), {
        properties: { className: ['title_extra'] }
      }))
    }
    return [
      tag('h2', [tag('code', name, { noClass: true })], {
        slug: (className + '-' + member.name).toLowerCase()
      }),
      ...toHtml(member.description),
      ...paramsHtml(member.params),
      ...returnsHtml(member.returns[0]),
      ...exampleHtml(member.examples[0])
    ]
  })
}

function classHtml (cls) {
  return tag('article', [
    tag('h1', cls.name, {
      editUrl: getEditUrl(cls.context.file)
    }),
    ...toHtml(cls.description),
    ...paramsHtml(cls.tags.filter(i => i.title === 'param')),
    ...exampleHtml(cls.examples[0]),
    ...staticHtml(cls.name, cls.members.static),
    ...instanceHtml(cls.name, cls.members.instance)
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
