import { join, dirname, sep } from 'path'
import { promises as fs } from 'fs'
import remarkHighlight from 'remark-highlight.js'
import remarkRehype from 'remark-rehype'
import makeDir from 'make-dir'
import slugify from 'slugify'
import remark from 'remark'

import { step } from '../lib/spinner.js'
import { DIST } from '../lib/dirs.js'

const CAPITALIZED = /^[A-Z]/

const KINDS = [
  ['Functions', i => i.kindString === 'Function'],
  ['Variables', i => i.kindString === 'Variable'],
  ['Types', i => i.kindString === 'Type alias' || i.kindString === 'Interface']
]

const EXTERNAL_TYPES = {
  Partial: 'https://www.typescriptlang.org/docs/handbook/' +
           'utility-types.html#partialt',
  Promise: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/' +
           'Using_promises',
  Observable: 'https://github.com/tc39/proposal-observable',
  ReduxContext: 'https://react-redux.js.org/using-react-redux/accessing-store',
  Process: 'https://nodejs.org/api/process.html#process_process',
  BunyanLogger: 'https://github.com/trentm/node-bunyan',
  HTTPServer: 'https://nodejs.org/api/http.html#http_class_http_server',
  Unsubscribe: 'https://github.com/ai/nanoevents/#remove-listener'
}

const SIMPLE_TYPES = new Set([
  'WebSocket',
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

const REPLACE_TYPES = {
  BaseServer: 'Server'
}

const HIDE_CONSTRUCTOR = new Set([
  'ChannelContext',
  'Context',
  'ServerClient',
  'TestLog'
])

function toSlug (type) {
  let slug = type
  if (!CAPITALIZED.test(slug)) slug = 'globals-' + slug
  return slugify(slug).toLowerCase()
}

function byTypeAndName (a, b) {
  if (a.kindString === 'Method' && b.kindString !== 'Method') {
    return 1
  } else if (a.kindString !== 'Method' && b.kindString === 'Method') {
    return -1
  } else {
    return byName(a, b)
  }
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
  if (!Array.isArray(children)) {
    children = [children]
  }
  children = children.map(i => {
    return typeof i === 'string' ? { type: 'text', value: i } : i
  })
  return { type: 'element', tagName, properties: { }, children, ...opts }
}

function toHtml (content) {
  if (!content) return []
  content = content.replace(/{@link [\w#.]+}/g, str => {
    let name = str.slice(7, -1)
    let link = name.toLowerCase().replace('#', '-')
    if (!CAPITALIZED.test(name)) link = 'globals-' + link
    return `[\`${ name }\`](#${ link })`
  })
  let tree = remark().parse(content)
  remarkHighlight({ prefix: 'code-block_' })(tree)
  return remarkRehype()(tree).children
}

function joinTags (separator, tags) {
  return tags.flatMap((el, index) => {
    if (index === tags.length - 1) {
      return el
    } else {
      return [...el, { type: 'text', value: separator }]
    }
  })
}

function declHtml (decl) {
  let type = []
  if (decl.type) {
    type = typeHtml(decl.type)
  } else if (decl.children) {
    type = joinTags(', ', decl.children.map(declHtml))
  } else if (decl.indexSignature) {
    let index = decl.indexSignature
    type = [
      { type: 'text', value: `[${ index.parameters[0].name }: ` },
      ...typeHtml(index.parameters[0].type),
      { type: 'text', value: ']: ' },
      ...typeHtml(index.type)
    ]
  } else if (decl.signatures) {
    if (decl.signatures[0].parameters) {
      let signature = decl.signatures[0]
      type = [
        { type: 'text', value: '(' },
        ...joinTags(', ', signature.parameters.map(declHtml)),
        { type: 'text', value: ') => ' },
        ...typeHtml(signature.type)
      ]
    } else {
      type = [
        { type: 'text', value: '() => ' },
        ...typeHtml(decl.signatures[0].type)
      ]
    }
  }
  if (decl.name === '__type' && decl.signatures) {
    return type
  } else if (decl.name === '__type' && type.length === 0) {
    return [{ type: 'text', value: '{ }' }]
  } else if (decl.name === '__type') {
    return [
      { type: 'text', value: '{ ' },
      ...type,
      { type: 'text', value: ' }' }
    ]
  } else {
    let name = decl.name
    if (decl.flags.isOptional) name += '?'
    return [{ type: 'text', value: name + ': ' }, ...type]
  }
}

function typeHtml (type) {
  if (!type) {
    return []
  } else if (type.type === 'reference') {
    let result
    if (SIMPLE_TYPES.has(type.name)) {
      result = [{ type: 'text', value: type.name }]
    } else if (EXTERNAL_TYPES[type.name]) {
      result = [
        tag('a', type.name, {
          properties: { href: EXTERNAL_TYPES[type.name] }
        })
      ]
    } else {
      let name = REPLACE_TYPES[type.name] || type.name
      result = [
        tag('a', name, {
          properties: { href: '#' + name.toLowerCase() }
        })
      ]
    }
    if (type.typeArguments) {
      result.push(
        { type: 'text', value: '<' },
        ...joinTags(', ', type.typeArguments.map(typeHtml)),
        { type: 'text', value: '>' }
      )
    }
    return result
  } else if (type.type === 'stringLiteral') {
    return [{ type: 'text', value: `'${ type.value }'` }]
  } else if (type.type === 'intrinsic' || type.type === 'typeParameter') {
    return [{ type: 'text', value: type.name }]
  } else if (type.type === 'indexedAccess') {
    return [
      ...typeHtml(type.objectType),
      { type: 'text', value: '[' },
      ...typeHtml(type.indexType),
      { type: 'text', value: ']' }
    ]
  } else if (type.type === 'union') {
    return joinTags(' | ', type.types.map(typeHtml))
  } else if (type.type === 'array') {
    return [
      ...typeHtml(type.elementType),
      { type: 'text', value: '[]' }
    ]
  } else if (type.type === 'reflection' && type.declaration) {
    return declHtml(type.declaration)
  } else if (type.type === 'tuple') {
    return [
      { type: 'text', value: '[' },
      ...joinTags(', ', type.elements.map(typeHtml)),
      { type: 'text', value: ']' }
    ]
  } else if (type.type === 'intersection') {
    return joinTags(' & ', type.types.map(typeHtml))
  } else if (type.type === 'conditional') {
    return [
      ...typeHtml(type.checkType),
      { type: 'text', value: ' ? ' },
      ...typeHtml(type.trueType),
      { type: 'text', value: ' : ' },
      ...typeHtml(type.falseType)
    ]
  } else if (type.type === 'typeOperator') {
    return [
      { type: 'text', value: ` ${ type.operator } ` },
      ...typeHtml(type.target)
    ]
  } else {
    console.error(type)
    throw new Error(`Unknown type ${ type.type }`)
  }
}

function getEditUrl (file) {
  if (sep !== '\\') file = file.replace(/\\/g, '/')
  let [, name, path] = file.match(/logux-([^/]+)\/(.*)$/)
  return `https://github.com/logux/${ name }/edit/master/${ path }`
}

function extendsHtml (parentClasses) {
  if (parentClasses) {
    let name = parentClasses[0].name
    if (name === 'BaseServer') return []
    let link
    if (SIMPLE_TYPES.has(name)) {
      link = tag('code', name)
    } else {
      link = tag('a', name, { properties: { href: '#' + name.toLowerCase() } })
    }
    return [tag('p', ['Extends ', link, '.'])]
  } else {
    return []
  }
}

function extractChildren (nodes) {
  if (nodes.length === 0) {
    return []
  } else {
    return nodes[0].children
  }
}

function commentHtml (comment) {
  if (!comment) return []
  return toHtml(comment.shortText + '\n\n' + comment.text)
}

function propTypeHtml (type) {
  if (!type) return []
  return [
    tag('p', [
      { type: 'text', value: 'Type: ' },
      tag('code', typeHtml(type), { noClass: true }),
      { type: 'text', value: '. ' }
    ])
  ]
}

function returnsHtml (node) {
  if (!node.signatures) return []
  let type = node.signatures[0].type
  if (type.name === 'void') return []
  let comment = node.comment || node.signatures[0].comment
  return [
    tag('p', [
      { type: 'text', value: 'Returns ' },
      tag('code', typeHtml(type), { noClass: true }),
      { type: 'text', value: '. ' },
      ...extractChildren(toHtml(comment.returns || ''))
    ])
  ]
}

function tableHtml (name, list) {
  return [
    tag('table', [
      tag('tr', [
        tag('th', name),
        tag('th', 'Type'),
        tag('th', 'Description')
      ]),
      ...Array.from(list)
        .map(i => tag('tr', [
          tag('td', [
            tag('code', i.name),
            { type: 'text', value: i.flags.isOptional ? ' optional' : '' }
          ]),
          tag('td', [
            tag('code', typeHtml(i.type), { noClass: true })
          ]),
          tag('td', extractChildren(commentHtml(i.comment)))
        ]))
    ])
  ]
}

function methodArgs (node) {
  if (!node.signatures[0].parameters) return '()'
  let args = node.signatures[0].parameters
    .map(i => i.name + (i.flags.isOptional ? '?' : ''))
    .join(', ')
  return `(${ args })`
}

function paramsHtml (node) {
  if (!node.signatures) return []
  return [
    { type: 'text', value: 'Type templates for TypeScript:' },
    ...node.signatures
      .filter(i => i.parameters)
      .flatMap(i => tableHtml('Parameter', i.parameters))
  ]
}

function templatesHtml (node) {
  if (!node.signatures) return []
  if (!node.signatures[0].typeParameters) return []
  return tableHtml('Templates', node.signatures[0].typeParameters)
}

function membersHtml (className, members, separator) {
  let slugSep = separator === '#' ? '-' : separator
  return members
    .filter(i => i.name !== 'constructor' && i.name !== 'Error')
    .sort(byTypeAndName)
    .map(member => {
      let name = [
        tag('span', className + separator, {
          properties: { className: ['title_extra'] }
        }),
        { type: 'text', value: member.name }
      ]
      if (member.kindString === 'Method') {
        name.push(tag('span', methodArgs(member), {
          properties: { className: ['title_extra'] }
        }))
      }
      return tag('section', [
        tag('h2', [
          tag('code', name, { noClass: true })
        ], {
          slug: (className + slugSep + member.name).toLowerCase()
        }),
        ...commentHtml(member.comment || member.signatures[0].comment),
        ...propTypeHtml(member.type),
        ...paramsHtml(member),
        ...templatesHtml(member),
        ...returnsHtml(member)
      ])
    })
}

function classHtml (tree, cls) {
  let hideConstructore = HIDE_CONSTRUCTOR.has(cls.name)
  let statics = cls.children.filter(i => i.flags.isStatic)
  let instance = cls.children.filter(i => !statics.includes(i))
  return tag('article', [
    tag('h1', cls.name, {
      editUrl: getEditUrl(cls.sources[0].fileName)
    }),
    ...extendsHtml(cls.extendedTypes),
    ...commentHtml(cls.comment),
    ...(hideConstructore ? [] : paramsHtml(cls.groups[0].children[0])),
    ...membersHtml(cls.name, statics, '.'),
    ...membersHtml(cls.name, instance, '#')
  ])
}

function functionHtml (node) {
  return tag('section', [
    tag('h2', [
      tag('code', [
        { type: 'text', value: node.name },
        tag('span', methodArgs(node), {
          properties: { className: ['title_extra'] }
        })
      ], { noClass: true })
    ], {
      slug: toSlug(node.name)
    }),
    ...commentHtml(node.signatures[0].comment),
    ...paramsHtml(node),
    ...returnsHtml(node)
  ])
}

function variableHtml (node) {
  return tag('section', [
    tag('h2', [
      tag('code', [
        { type: 'text', value: node.name }
      ], { noClass: true })
    ], {
      slug: toSlug(node.name)
    }),
    ...propTypeHtml(node.type),
    ...commentHtml(node.comment)
  ])
}

function listHtml (title, list) {
  if (list.length === 0) return []
  let article = tag('article', [
    tag('h1', title, { noSlug: true }),
    ...list.sort(byName).map(i => {
      if (i.kindString === 'Function') {
        return functionHtml(i)
      } else {
        return variableHtml(i)
      }
    })
  ])
  return [article]
}

function toTree (nodes) {
  let tree = {
    type: 'root',
    children: nodes
      .filter(i => i.kindString === 'Class')
      .sort(byName)
      .map(i => classHtml(nodes, i))
  }
  for (let [title, filter] of KINDS) {
    let items = nodes.filter(filter)
    if (items.length > 0) {
      tree.children.push(...listHtml(title, items))
    }
  }
  return tree
}

function submenuName (node) {
  return node.name + (node.kind === 'function' ? '()' : '')
}

function toSubmenu (nodes) {
  let submenu = nodes
    .filter(i => i.kindString === 'Class')
    .sort(byName)
    .map(cls => ({
      code: cls.name,
      link: '#' + cls.name.toLowerCase()
    }))
  for (let [title, filter] of KINDS) {
    if (title !== 'Types') {
      let items = nodes.filter(filter).sort(byName)
      if (items.length > 0) {
        submenu.push({
          text: title,
          ul: items.map(i => {
            return { code: submenuName(i), link: '#' + toSlug(i.name) }
          })
        })
      }
    }
  }
  return submenu
}

export default async function buildApi (assets, layout, title, nodes) {
  let file = title.replace(/\s/g, '-').toLowerCase()
  let path = join(DIST, file, 'index.html')

  let end = step(`Building ${ title } HTML`)

  await makeDir(dirname(path))
  let tree = toTree(nodes)
  let submenu = toSubmenu(nodes)
  let html = await layout(`/${ file }/`, submenu, title + ' / ', tree)
  await fs.writeFile(path, html)
  assets.add(path, html)

  end()
}
