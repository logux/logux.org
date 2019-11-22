let { join, dirname, sep } = require('path')
let createFormatters = require('documentation/src/output/util/formatters')
let { writeFile } = require('fs').promises
let remarkRehype = require('remark-rehype')
let unistVisit = require('unist-util-visit')
let lowlight = require('lowlight')
let makeDir = require('make-dir')
let slugify = require('slugify')
let remark = require('remark')

let { step } = require('../lib/spinner')

const CAPITALIZED = /^[A-Z]/
const DIST = join(__dirname, '..', '..', 'dist')
const EXTERNAL_TYPES = {
  'BunyanLogger': 'https://github.com/trentm/node-bunyan',
  'http.Server': 'https://nodejs.org/api/http.html#http_class_http_server'
}
const SIMPLE_TYPES = new Set([
  'Observable',
  'WebSocket',
  'Promise',
  'RegExp',
  'Error',
  'Array',
  'function',
  'boolean',
  'string',
  'object',
  'number',
  'any'
])

let formatters = createFormatters()

function toSlug (type) {
  let slug = type
  if (!CAPITALIZED.test(slug)) slug = 'globals-' + slug
  return slugify(slug).toLowerCase()
}

function toSourceUrl ({ file, loc }) {
  return file.replace(
    /^.*\/logux-([^/]+)\/(.*)$/,
    'https://github.com/logux/$1/blob/master/$2'
  ) + `#L${ loc.start.line }L${ loc.end.line }`
}

function byName (a, b) {
  if (CAPITALIZED.test(a.name) && !CAPITALIZED.test(b.name)) {
    return -1
  } else if (!CAPITALIZED.test(a.name) && CAPITALIZED.test(b.name)) {
    return 1
  } else {
    return a.name.localeCompare(b.name)
  }
}

function tag (tagName, children, opts) {
  if (typeof children === 'string') {
    children = [{ type: 'text', value: children }]
  }
  return { type: 'element', tagName, properties: { }, children, ...opts }
}

function tableDesc (parent, desc) {
  if (!desc) {
    return []
  } else if (desc.type === 'root') {
    return toHtml(parent, desc)[0].children
  } else {
    let md = desc.replace(/\{@link ([\w]+)}/, '[$1]($1)')
    return toHtml(parent, remark().parse(md))[0].children
  }
}

function toHtml (parent, tree) {
  if (!tree) return []
  unistVisit(tree, 'link', node => {
    if (/^[\w#.]+$/.test(node.url)) {
      let ref = node.children[0].value
      if (ref.startsWith('#')) {
        if (!parent) throw new Error(`Unknown parent for ${ ref }`)
        ref = parent + ref
      }
      node.url = '#' + toSlug(ref.replace(/#/g, '-'))
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
  } else if (type.type === 'NullLiteral') {
    return [{ type: 'text', value: 'null' }]
  } else if (type.type === 'TypeApplication') {
    if (type.expression.name === 'Array') {
      return [
        ...typeHtml(type.applications[0]),
        { type: 'text', value: '[]' }
      ]
    } else {
      return [
        { type: 'text', value: type.expression.name + '<' },
        ...typeHtml(type.applications[0]),
        { type: 'text', value: '>' }
      ]
    }
  } else if (type.type === 'BooleanLiteralType') {
    return [{ type: 'text', value: type.value.toString() }]
  } else if (SIMPLE_TYPES.has(type.name)) {
    return [{ type: 'text', value: type.name }]
  } else if (type.type === 'NameExpression') {
    let href = EXTERNAL_TYPES[type.name] || '#' + toSlug(type.name)
    return [tag('a', type.name, { properties: { href } })]
  } else {
    console.error(type)
    throw new Error(`Unknown type ${ type.type }`)
  }
}

function tableHtml (parent, name, list) {
  if (list.length === 0) return []
  let table = tag('table', [
    tag('tr', [
      tag('th', 'Property'),
      tag('th', 'Type'),
      tag('th', 'Description')
    ]),
    ...list
      .sort(byName)
      .map(i => tag('tr', [
        tag('td', [
          tag('code', i.name)
        ]),
        tag('td', [
          tag('code', typeHtml(i.type), { noClass: true })
        ]),
        tag('td', tableDesc(parent, i.description))
      ]))
  ])
  return [table]
}

function propertiesHtml (parent, props) {
  return tableHtml(parent, 'Properties', props)
}

function paramsHtml (parent, params) {
  return tableHtml(parent, 'Parameter', params)
}

function returnsHtml (parent, returns) {
  if (!returns) return []
  if (returns.type.type === 'UndefinedLiteral') return []
  let p = tag('p', [
    { type: 'text', value: 'Returns ' },
    tag('code', typeHtml(returns.type), { noClass: true }),
    { type: 'text', value: '. ' },
    ...toHtml(parent, returns.description)[0].children
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

function propTypeHtml (type) {
  if (!type) return []
  let p = tag('p', [
    { type: 'text', value: 'Type: ' },
    tag('code', typeHtml(type), { noClass: true }),
    { type: 'text', value: '. ' }
  ])
  return [p]
}

function membersHtml (className, members, separator) {
  let slugSep = separator === '#' ? '-' : separator
  return members
    .sort((a, b) => {
      if (a.kind === 'function' && b.kind !== 'function') {
        return 1
      } else if (a.kind !== 'function' && b.kind === 'function') {
        return -1
      } else {
        return byName(a, b)
      }
    })
    .map(member => {
      let name = [
        tag('span', className + separator, {
          properties: { className: ['title_extra'] }
        }),
        { type: 'text', value: member.name }
      ]
      if (member.kind === 'function') {
        name.push(tag('span', formatters.parameters(member, true), {
          properties: { className: ['title_extra'] }
        }))
      }
      return tag('section', [
        tag('h2', [
          tag('code', name, { noClass: true })
        ], {
          sourceUrl: toSourceUrl(member.context),
          slug: (className + slugSep + member.name).toLowerCase()
        }),
        ...propTypeHtml(member.type),
        ...toHtml(className, member.description),
        ...paramsHtml(className, member.params),
        ...returnsHtml(className, member.returns[0]),
        ...propertiesHtml(className, member.properties),
        ...exampleHtml(member.examples[0])
      ])
    })
}

function extendsHtml (tree, augment) {
  if (!augment) return []
  if (!tree.some(j => j.name === augment.name)) return []
  let p = tag('p', [
    { type: 'text', value: 'Extends ' },
    tag('code', [
      tag('a', augment.name, {
        properties: { href: '#' + toSlug(augment.name) }
      })
    ], { noClass: true }),
    { type: 'text', value: '. ' }
  ])
  return [p]
}

function classHtml (tree, cls) {
  return tag('article', [
    tag('h1', cls.name, {
      editUrl: getEditUrl(cls.context.file)
    }),
    ...toHtml(cls.name, cls.description),
    ...extendsHtml(tree, cls.augments[0]),
    ...paramsHtml(cls.name, cls.tags.filter(i => i.title === 'param')),
    ...exampleHtml(cls.examples[0]),
    ...membersHtml(cls.name, cls.members.static, '.'),
    ...membersHtml(cls.name, cls.members.instance, '#')
  ])
}

function standaloneHtml (type, node) {
  let name = [{ type: 'text', value: node.name }]
  if (node.kind === 'function') {
    name.push(
      tag('span', formatters.parameters(node, true), {
        properties: { className: ['title_extra'] }
      })
    )
  }
  let ownType = type !== 'Callbacks' ? propTypeHtml(node.type) : []
  return tag('section', [
    tag('h2', [
      tag('code', name, { noClass: true })
    ], {
      sourceUrl: toSourceUrl(node.context),
      slug: toSlug(node.name)
    }),
    ...ownType,
    ...toHtml(undefined, node.description),
    ...propertiesHtml(undefined, node.properties),
    ...paramsHtml(undefined, node.params),
    ...returnsHtml(undefined, node.returns[0]),
    ...exampleHtml(node.examples[0])
  ])
}

function listHtml (title, list) {
  if (list.length === 0) return []
  let article = tag('article', [
    tag('h1', title, { noSlug: true }),
    ...list.sort(byName).map(i => standaloneHtml(title, i))
  ])
  return [article]
}

function isCallback (node) {
  return node.tags.some(i => i.title === 'callback')
}

function toTree (jsdoc) {
  return {
    type: 'root',
    children: jsdoc
      .filter(i => i.kind === 'class')
      .sort(byName)
      .map(i => classHtml(jsdoc, i))
      .concat(listHtml('Functions', jsdoc.filter(i => i.kind === 'function')))
      .concat(listHtml('Callbacks', jsdoc.filter(i => {
        return i.kind === 'typedef' && isCallback(i)
      })))
      .concat(listHtml('Types', jsdoc.filter(i => {
        return i.kind === 'typedef' && !isCallback(i)
      })))
      .concat(listHtml('Constants', jsdoc.filter(i => i.kind === 'constant')))
  }
}

module.exports = async function buildApi (assets, layout, title, jsdoc) {
  let file = title.replace(/\s/g, '-').toLowerCase()
  let path = join(DIST, file, 'index.html')

  let end = step(`Building ${ title } HTML`)

  await makeDir(dirname(path))
  let tree = toTree(jsdoc)
  let html = await layout.api(title, `/${ file }/`, tree)
  await writeFile(path, html)
  assets.add(path)

  end()
}
