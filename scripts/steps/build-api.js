import { join, dirname, sep } from 'path'
import { promises as fs } from 'fs'
import remarkHighlight from 'remark-highlight.js'
import remarkRehype from 'remark-rehype'
import makeDir from 'make-dir'
import slugify from 'slugify'
import remark from 'remark'
import ts from 'typescript'

import { step } from '../lib/spinner.js'
import { DIST } from '../lib/dirs.js'

const CAPITALIZED = /^[A-Z]/

const EXTERNAL_TYPES = {
  Observable: 'https://github.com/tc39/proposal-observable',
  Process: 'https://nodejs.org/api/process.html#process_process',
  HTTPServer: 'https://nodejs.org/api/http.html#http_class_http_server',
  Unsubscribe: 'https://github.com/ai/nanoevents/#remove-listener',
  Component: 'https://reactjs.org/docs/react-component.html',
  WebSocket: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
  ComponentType:
    'https://github.com/DefinitelyTyped/DefinitelyTyped/blob/' +
    'master/types/react/index.d.ts#L81',
  App: 'https://v3.vuejs.org/api/global-api.html#createapp',
  InjectionKey: 'https://v3.vuejs.org/api/composition-api.html#provide-inject',
  Ref: 'https://v3.vuejs.org/api/refs-api.html#ref',
  ComputedGetter: 'https://v3.vuejs.org/api/computed-watch-api.html#computed',
  ComputedRef: 'https://v3.vuejs.org/api/computed-watch-api.html#computed',
  LogFn: 'https://getpino.io/#/docs/api?id=logging-method-parameters',
  IncomingMessage:
    'https://nodejs.org/api/http.html#http_class_http_incomingmessage',
  ServerResponse:
    'https://nodejs.org/api/http.html#http_class_http_serverresponse',
  RequestInit:
    'https://developer.mozilla.org/en-US/docs/Web/API/' +
    'WindowOrWorkerGlobalScope/fetch',
  fetch:
    'https://developer.mozilla.org/en-US/docs/Web/API/' +
    'WindowOrWorkerGlobalScope/fetch',
  Emitter: 'https://github.com/ai/nanoevents',
  FC:
    'https://react-typescript-cheatsheet.netlify.app/docs/' +
    'basic/getting-started/function_components',
  ReactContext: 'https://reactjs.org/docs/context.html'
}

const SIMPLE_TYPES = new Set([
  'WebSocket',
  'RegExp',
  'Error',
  'Array',
  'Function',
  'boolean',
  'string',
  'object',
  'number',
  'any',
  'StoreValue',
  'StoreValues'
])

const UTILITY_TYPES = new Set([
  'Map',
  'Readonly',
  'Promise',
  'Partial',
  'Pick',
  'Exclude',
  'Omit',
  'ReturnType',
  'Ref',
  'ReadonlyRef',
  'UnwrapRef'
])

const HIDE_CONSTRUCTOR = new Set([
  'ChannelContext',
  'Context',
  'ServerClient',
  'TestLog'
])

const EMPTY = { type: 'text', value: '' }
const OPTIONAL = [
  { type: 'text', value: ' ' },
  {
    type: 'element',
    tagName: 'span',
    properties: { 'aria-title': 'Optional' },
    children: [{ type: 'text', value: '?' }]
  }
]

const IGNORE_TYPES = new Set(['DefineAction', 'BuilderValue', 'Vue.Refable'])
const IGNORE_TYPE_TEMPLATES = new Set(['StoreExt'])
const REPLACE_TYPE_TEMPLATE = {
  AppPages: 'Pages',
  Value: 'SyncMapValues'
}
const UNWRAP_UTILITIES = new Set([
  'ReadonlyIfObject',
  'DeepReadonly',
  'Readonly'
])

const EXCLUDED_SUBMENU_KINDS = new Set(['Type alias', 'Interface', 'Namespace'])
const EXCLUDED_TREE_KINDS = new Set(['Namespace'])
const CORE_ENTITIES = new Set([
  'BaseNode',
  'Connection',
  'Log',
  'MemoryStore',
  'Reconnect',
  'ServerConnection',
  'defineAction',
  'isFirstOlder',
  'parseId'
])
const CLIENT_ENTITIES = new Set([
  'Client',
  'CrossTabClient',
  'IndexedStore',
  'attention',
  'badge',
  'buildNewSyncMap',
  'changeSyncMap',
  'changeSyncMapById',
  'confirm',
  'createFilter',
  'createSyncMap',
  'defineSyncMap',
  'deleteSyncMap',
  'deleteSyncMapById',
  'encryptActions',
  'favicon',
  'log',
  'request'
])
const SERVER_ENTITIES = new Set([
  'ChannelContext',
  'Context',
  'ResponseError',
  'Server',
  'ServerClient',
  'del',
  'get',
  'patch',
  'post',
  'put',
  'request'
])
const STATE_ENTITIES = new Set([
  'createDerived',
  'createMap',
  'createPersistent',
  'createRouter',
  'createStore',
  'getPagePath',
  'getValue',
  'openPage'
])
const TEST_ENTITIES = new Set([
  'TestClient',
  'TestLog',
  'TestPair',
  'TestServer',
  'TestTime',
  'cleanStores',
  'emptyInTest',
  'prepareForTest'
])

const GROUPS = {
  Client: 'Client',
  Core: 'Core',
  Other: 'Other',
  React: 'React',
  Server: 'Server',
  State: 'Logux State',
  Tests: 'Tests',
  Vue: 'Vue'
}

// More specific group conditions should be placed higher
const GROUPS_CONDITION = {
  [GROUPS.React]: node => isSource(node, 'react'),
  [GROUPS.Vue]: node => isSource(node, 'vue'),
  [GROUPS.Tests]: node => TEST_ENTITIES.has(node.name),
  [GROUPS.Client]: node =>
    CLIENT_ENTITIES.has(node.name) && isSource(node, 'logux-client'),
  [GROUPS.Core]: node => CORE_ENTITIES.has(node.name),
  [GROUPS.Server]: node =>
    SERVER_ENTITIES.has(node.name) && isSource(node, 'logux-server'),
  [GROUPS.State]: node => STATE_ENTITIES.has(node.name)
}

const GROUPS_ORDER = [
  GROUPS.State,
  GROUPS.React,
  GROUPS.Vue,
  GROUPS.Client,
  GROUPS.Server,
  GROUPS.Tests,
  GROUPS.Core,
  GROUPS.Other
]

function toSlug(type) {
  let slug = type
  if (!CAPITALIZED.test(slug)) slug = 'globals-' + slug
  return slugify(slug).toLowerCase()
}

function byTypeAndName(a, b) {
  if (a.kindString === 'Method' && b.kindString !== 'Method') {
    return 1
  } else if (a.kindString !== 'Method' && b.kindString === 'Method') {
    return -1
  } else {
    return byName(a, b)
  }
}

function byName(a, b) {
  if (CAPITALIZED.test(a.name) && !CAPITALIZED.test(b.name)) {
    return -1
  } else if (!CAPITALIZED.test(a.name) && CAPITALIZED.test(b.name)) {
    return 1
  } else {
    return a.name.localeCompare(b.name)
  }
}

function tag(tagName, children, opts) {
  if (!Array.isArray(children)) {
    children = [children]
  }
  children = children.map(i => {
    return typeof i === 'string' ? { type: 'text', value: i } : i
  })
  return { type: 'element', tagName, properties: {}, children, ...opts }
}

function toHtml(content) {
  if (!content) return []
  content = content.replace(/{@link [\w#.]+}/g, str => {
    let name = str.slice(7, -1)
    let link = name.toLowerCase().replace('#', '-')
    if (!CAPITALIZED.test(name)) link = 'globals-' + link
    return `[\`${name}\`](#${link})`
  })
  let tree = remark().parse(content)
  remarkHighlight({ prefix: 'code-block_' })(tree)
  return remarkRehype()(tree).children
}

function joinTags(separator, tags) {
  return tags.flatMap((el, index) => {
    if (index === tags.length - 1) {
      return el
    } else {
      return [...el, { type: 'text', value: separator }]
    }
  })
}

function declHtml(ctx, decl) {
  let type = []
  if (decl.type) {
    type = typeHtml(ctx, decl.type)
  } else if (decl.children) {
    type = joinTags(
      ', ',
      decl.children.map(i => declHtml(ctx, i))
    )
  } else if (decl.indexSignature) {
    let index = decl.indexSignature
    type = [
      { type: 'text', value: `[${index.parameters[0].name}: ` },
      ...typeHtml(ctx, index.parameters[0].type),
      { type: 'text', value: ']: ' },
      ...typeHtml(ctx, index.type)
    ]
  } else if (decl.signatures) {
    if (decl.signatures[0].parameters) {
      let signature = decl.signatures[0]
      type = [
        { type: 'text', value: '(' },
        ...joinTags(
          ', ',
          signature.parameters.map(i => declHtml(ctx, i))
        ),
        { type: 'text', value: ') => ' },
        ...typeHtml(ctx, signature.type)
      ]
    } else {
      type = [
        { type: 'text', value: '() => ' },
        ...typeHtml(ctx, decl.signatures[0].type)
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

function findTypeTemplate(type, name) {
  if (!type) {
    return null
  } else if (type.valueDeclaration && type.valueDeclaration.typeParameters) {
    let param = type.valueDeclaration.typeParameters.find(i => {
      return i.name.escapedText === name
    })
    if (param) return param
  }
  return findTypeTemplate(type.parent, name)
}

function typeLink(ctx, name) {
  if (name === 'Meta') {
    if (ctx.file === 'node-api') {
      return typeHtml(ctx, { type: 'reference', name: 'ServerMeta' })
    } else {
      return typeHtml(ctx, { type: 'reference', name: 'ClientMeta' })
    }
  } else if (SIMPLE_TYPES.has(name)) {
    return [{ type: 'text', value: name }]
  } else if (EXTERNAL_TYPES[name]) {
    return [
      tag('a', name, {
        properties: { href: EXTERNAL_TYPES[name] }
      })
    ]
  } else {
    return [
      tag('a', name, {
        properties: { href: '#' + toSlug(name) }
      })
    ]
  }
}

function tsKindHtml(ctx, tsType) {
  if (tsType.kind === ts.SyntaxKind.TypeReference) {
    let name = tsType.typeName.escapedText
    if (name === 'Record') {
      return [
        { type: 'text', value: '{ [key: ' },
        ...tsKindHtml(ctx, tsType.typeArguments[0]),
        { type: 'text', value: ']: ' },
        ...tsKindHtml(ctx, tsType.typeArguments[1]),
        { type: 'text', value: ' }' }
      ]
    }
    if (UNWRAP_UTILITIES.has(tsType.name)) {
      return tsKindHtml(ctx, tsType.typeArguments[0])
    }
    if (UTILITY_TYPES.has(name)) {
      return [
        { type: 'text', value: name + '<' },
        ...joinTags(
          ',',
          tsType.typeArguments.map(i => tsKindHtml(ctx, i))
        ),
        { type: 'text', value: '>' }
      ]
    }
    if (REPLACE_TYPE_TEMPLATE[name]) {
      return typeLink(ctx, REPLACE_TYPE_TEMPLATE[name])
    }
    return typeLink(ctx, name)
  } else if (tsType.kind === ts.SyntaxKind.UndefinedKeyword) {
    return [{ type: 'text', value: 'undefined' }]
  } else if (tsType.kind === ts.SyntaxKind.ObjectKeyword) {
    return [{ type: 'text', value: 'object' }]
  } else if (tsType.kind === ts.SyntaxKind.StringKeyword) {
    return [{ type: 'text', value: 'string' }]
  } else if (tsType.kind === ts.SyntaxKind.AnyKeyword) {
    return [{ type: 'text', value: 'any' }]
  } else if (tsType.kind === ts.SyntaxKind.UnionType) {
    return joinTags(
      ' | ',
      tsType.types.map(i => tsKindHtml(ctx, i))
    )
  } else if (tsType.operator === ts.SyntaxKind.KeyOfKeyword) {
    return [{ type: 'text', value: 'keyof ' }, ...tsKindHtml(ctx, tsType.type)]
  } else if (tsType.kind === ts.SyntaxKind.ArrayType) {
    return [
      ...tsKindHtml(ctx, tsType.elementType),
      { type: 'text', value: '[]' }
    ]
  } else if (tsType.kind === ts.SyntaxKind.LiteralType) {
    return [{ type: 'text', value: JSON.stringify(tsType.literal.text) }]
  } else {
    console.log(tsType)
    throw new Error('Unknown TS kind ' + ts.SyntaxKind[tsType.kind])
  }
}

function typeHtml(ctx, type) {
  if (!type) {
    return []
  } else if (type.type === 'reference') {
    let target = type._target

    if (type.name === 'Record') {
      return [
        { type: 'text', value: '{ [key: ' },
        ...typeHtml(ctx, type.typeArguments[0]),
        { type: 'text', value: ']: ' },
        ...typeHtml(ctx, type.typeArguments[1]),
        { type: 'text', value: ' }' }
      ]
    }
    if (type.name === 'Refable') {
      return [
        { type: 'text', value: 'Ref<' },
        ...typeHtml(ctx, type.typeArguments[0]),
        { type: 'text', value: '> | ' },
        ...typeHtml(ctx, type.typeArguments[0])
      ]
    }
    if (UNWRAP_UTILITIES.has(type.name)) {
      return typeHtml(ctx, type.typeArguments[0])
    }
    if (
      type.name === 'Promise' &&
      type.typeArguments.length === 1 &&
      type.typeArguments[0].name === 'void'
    ) {
      return [{ type: 'text', value: 'Promise' }]
    }
    if (UTILITY_TYPES.has(type.name)) {
      return [
        { type: 'text', value: type.name + '<' },
        ...joinTags(
          ',',
          type.typeArguments.map(i => typeHtml(ctx, i))
        ),
        { type: 'text', value: '>' }
      ]
    }

    if (target) {
      let template = findTypeTemplate(target, type.name)
      if (!template && target.declarations && target.declarations.length > 0) {
        template = target.declarations[0]
      }
      if (template) {
        if (template.constraint) {
          return tsKindHtml(ctx, template.constraint)
        } else if (template.default) {
          return tsKindHtml(ctx, template.default)
        }
      }
    }
    return typeLink(ctx, type.name)
  } else if (type.type === 'stringLiteral') {
    return [
      tag('span', `'${type.value}'`, {
        properties: { className: ['code-block_string'] }
      })
    ]
  } else if (type.type === 'intrinsic' || type.type === 'typeParameter') {
    return [{ type: 'text', value: type.name }]
  } else if (type.type === 'indexedAccess') {
    return [
      ...typeHtml(ctx, type.objectType),
      { type: 'text', value: '[' },
      ...typeHtml(ctx, type.indexType),
      { type: 'text', value: ']' }
    ]
  } else if (type.type === 'union') {
    return joinTags(
      ' | ',
      type.types.map(i => typeHtml(ctx, i))
    )
  } else if (type.type === 'array') {
    return [...typeHtml(ctx, type.elementType), { type: 'text', value: '[]' }]
  } else if (type.type === 'reflection' && type.declaration) {
    return declHtml(ctx, type.declaration)
  } else if (type.type === 'tuple') {
    return [
      { type: 'text', value: '[' },
      ...joinTags(
        ', ',
        type.elements.map(i => typeHtml(ctx, i))
      ),
      { type: 'text', value: ']' }
    ]
  } else if (type.type === 'intersection') {
    return joinTags(
      ' & ',
      type.types
        .filter(i => !IGNORE_TYPE_TEMPLATES.has(i.name))
        .map(i => typeHtml(ctx, i))
    )
  } else if (type.type === 'conditional') {
    return [
      ...typeHtml(ctx, type.checkType),
      { type: 'text', value: ' ? ' },
      ...typeHtml(ctx, type.trueType),
      { type: 'text', value: ' : ' },
      ...typeHtml(ctx, type.falseType)
    ]
  } else if (type.type === 'typeOperator') {
    return [
      tag('span', ` ${type.operator} `, {
        properties: { className: ['code-block_keyword'] }
      }),
      ...typeHtml(ctx, type.target)
    ]
  } else if (type.type === 'query') {
    return [
      { type: 'text', value: 'typeof ' },
      ...typeHtml(ctx, type.queryType)
    ]
  } else if (type.type === 'predicate') {
    return [
      { type: 'text', value: type.name + ' is ' },
      ...typeHtml(ctx, type.targetType)
    ]
  } else if (type.type === 'literal') {
    return [{ type: 'text', value: JSON.stringify(type.value) }]
  } else if (type.type === 'optional') {
    return [...typeHtml(type.elementType), { type: 'text', value: '?' }]
  } else if (type.type === 'rest') {
    return [{ type: 'text', value: '...' }, ...typeHtml(ctx, type.elementType)]
  } else if (type.type === 'mapped') {
    return [
      { type: 'text', value: `{ [${type.parameter}: ` },
      ...typeHtml(ctx, type.parameterType),
      { type: 'text', value: `]${type.optionalModifier ? '?' : ''}: ` },
      ...typeHtml(ctx, type.templateType),
      { type: 'text', value: ` }` }
    ]
  } else {
    console.error(type)
    throw new Error(`Unknown type ${type.type}`)
  }
}

function getEditUrl(file) {
  if (sep !== '\\') file = file.replace(/\\/g, '/')
  let [, name, path] = file.match(/logux-([^/]+)\/(.*)$/)
  return `https://github.com/logux/${name}/edit/main/${path}`
}

function extendsHtml(parentClasses) {
  if (parentClasses) {
    let name = parentClasses[0].name
    let link
    if (SIMPLE_TYPES.has(name)) {
      link = tag('code', name)
    } else if (EXTERNAL_TYPES[name]) {
      link = tag('a', name, { properties: { href: EXTERNAL_TYPES[name] } })
    } else {
      link = tag('a', name, { properties: { href: '#' + name.toLowerCase() } })
    }
    return [tag('p', ['Extends ', link, '.'])]
  } else {
    return []
  }
}

function extractChildren(nodes) {
  if (nodes.length === 0) {
    return []
  } else {
    return nodes[0].children
  }
}

function commentHtml(comment) {
  if (!comment) return []
  return toHtml(comment.shortText + '\n\n' + comment.text)
}

function propTypeHtml(ctx, type) {
  if (!type) return []
  return [
    tag('p', [
      { type: 'text', value: 'Type: ' },
      tag('code', typeHtml(ctx, type), { noClass: true }),
      { type: 'text', value: '. ' }
    ])
  ]
}

function returnsHtml(ctx, node) {
  if (!node.signatures) return []
  let type = node.signatures[0].type
  if (type.name === 'void') return []
  let comment = node.comment || node.signatures[0].comment || {}
  return [
    tag('p', [
      { type: 'text', value: 'Returns ' },
      tag('code', typeHtml(ctx, type), { noClass: true }),
      { type: 'text', value: '. ' },
      ...extractChildren(toHtml(comment.returns || ''))
    ])
  ]
}

function tableHtml(ctx, name, list) {
  let hasDesc = Array.from(list).some(i => i.comment)
  return [
    tag('table', [
      tag('tr', [
        tag('th', name),
        tag('th', 'Type'),
        hasDesc ? tag('th', 'Description') : EMPTY
      ]),
      ...Array.from(list).map(i => {
        let type
        if (i.signatures) {
          let signature = i.signatures[0]
          let params = signature.parameters || []
          type = [
            { type: 'text', value: '(' },
            ...joinTags(
              ', ',
              params.map(param => declHtml(ctx, param))
            ),
            { type: 'text', value: ') => ' },
            ...typeHtml(ctx, signature.type)
          ]
        } else {
          type = typeHtml(ctx, i.type)
        }
        let itemName = i.name
        if (i.kindString === 'Index signature') {
          itemName = [
            { type: 'text', value: '[' },
            ...declHtml(ctx, i.parameters[0]),
            { type: 'text', value: ']' }
          ]
        }
        return tag('tr', [
          tag('td', [
            tag('code', itemName),
            ...(i.flags.isOptional ? OPTIONAL : [EMPTY])
          ]),
          tag('td', [tag('code', type, { noClass: true })]),
          hasDesc ? tag('td', extractChildren(commentHtml(i.comment))) : EMPTY
        ])
      })
    ])
  ]
}

function methodArgs(node) {
  if (!node.signatures[0].parameters) return '()'
  let args = node.signatures[0].parameters
    .map(i => i.name + (i.flags.isOptional ? '?' : ''))
    .join(', ')
  return `(${args})`
}

function paramsHtml(ctx, node, name = 'Parameter') {
  if (!node.signatures) return []
  return node.signatures
    .filter(i => i.parameters && i.parameters.length > 0)
    .flatMap(i => tableHtml(ctx, name, i.parameters))
}

function membersHtml(ctx, className, members, separator) {
  if (!members) return []
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
        name.push(
          tag('span', methodArgs(member), {
            properties: { className: ['title_extra'] }
          })
        )
      }
      let comment = member.comment
      if (!comment && member.signatures) {
        comment = member.signatures[0].comment
      }
      return tag('section', [
        tag('h2', [tag('code', name, { noClass: true })], {
          slug: (className + slugSep + member.name).toLowerCase()
        }),
        ...commentHtml(comment),
        ...propTypeHtml(ctx, member.type),
        ...paramsHtml(ctx, member, 'Argument'),
        ...returnsHtml(ctx, member)
      ])
    })
}

function classHtml(ctx, cls) {
  let hideConstructore = HIDE_CONSTRUCTOR.has(cls.name)
  let statics = cls.children.filter(i => i.flags.isStatic)
  let instance = cls.children.filter(i => !statics.includes(i))
  return tag('section', [
    tag('h1', cls.name, {
      editUrl: getEditUrl(cls.sources[0].fileName)
    }),
    ...extendsHtml(cls.extendedTypes),
    ...commentHtml(cls.comment),
    ...(hideConstructore ? [] : paramsHtml(ctx, cls.groups[0].children[0])),
    ...membersHtml(ctx, cls.name, statics, '.'),
    ...membersHtml(ctx, cls.name, instance, '#')
  ])
}

function functionHtml(ctx, node) {
  return tag('section', [
    tag(
      'h2',
      [
        tag(
          'code',
          [
            { type: 'text', value: node.name },
            tag('span', methodArgs(node), {
              properties: { className: ['title_extra'] }
            })
          ],
          { noClass: true }
        )
      ],
      {
        slug: toSlug(node.name)
      }
    ),
    ...commentHtml(node.signatures[0].comment),
    ...paramsHtml(ctx, node, 'Argument'),
    ...returnsHtml(ctx, node),
    ...membersHtml(ctx, node.name, node.children, '#')
  ])
}

function getChildren(type) {
  if (type.name === 'Omit') {
    return getChildren(type.typeArguments[0]).filter(i => {
      return type.typeArguments[1].types.every(j => j.value !== i.name)
    })
  } else {
    return type.reflection.type.declaration.children
  }
}

function isSource(node, project) {
  return node.sources.some(i => i.fileName.includes(project))
}

function variableHtml(ctx, node) {
  let body = []
  if (node.indexSignature) {
    body = tableHtml(
      ctx,
      'Property',
      (node.children || []).concat([node.indexSignature])
    )
  } else if (node.children) {
    body = tableHtml(ctx, 'Property', node.children)
  } else if (node.type) {
    let type = node.type
    if (
      type.declaration &&
      type.declaration.children &&
      type.declaration.children[0].comment
    ) {
      body = tableHtml(ctx, 'Property', type.declaration.children)
    } else if (
      type.types &&
      type.types[1].declaration &&
      type.types[1].declaration.children &&
      type.types[1].declaration.children[0].comment
    ) {
      body = tableHtml(ctx, 'Property', [
        ...getChildren(type.types[0]),
        ...type.types[1].declaration.children
      ])
      if (type.types[0].reflection) {
        body = [
          tag('p', [
            { type: 'text', value: 'Extends ' },
            ...typeHtml(ctx, type.types[0]),
            { type: 'text', value: '.' }
          ]),
          ...body
        ]
      }
    } else {
      body = propTypeHtml(ctx, type)
    }
  }
  return tag('section', [
    tag(
      'h2',
      [tag('code', [{ type: 'text', value: node.name }], { noClass: true })],
      {
        slug: toSlug(node.name)
      }
    ),
    ...commentHtml(node.comment),
    ...body
  ])
}

function groupNodes(nodes) {
  let groupsName = Object.keys(GROUPS_CONDITION)
  let groupedNodes = nodes.reduce((groups, node) => {
    let nodeGroup =
      groupsName.find(group => GROUPS_CONDITION[group](node)) || GROUPS.Other

    if (nodeGroup in groups) {
      groups[nodeGroup].push(node)
    } else {
      groups[nodeGroup] = [node]
    }

    return groups
  }, {})

  return groupedNodes
}

function toTree(ctx, nodes) {
  let treeNodes = nodes
    .filter(node => !SIMPLE_TYPES.has(node.name))
    .filter(node => !IGNORE_TYPES.has(node.name))
    .filter(node => !UTILITY_TYPES.has(node.name))
    .filter(node => !UNWRAP_UTILITIES.has(node.name))
    .filter(node => !EXCLUDED_TREE_KINDS.has(node.kindString))
    .sort(byName)
  let treeGroups = groupNodes(treeNodes)

  let treeChildren = GROUPS_ORDER.map(groupName => {
    let group = treeGroups[groupName]

    if (group === undefined) {
      return null
    }

    return tag('article', [
      ...group.map(node => {
        if (node.kindString === 'Class') {
          return classHtml(ctx, node)
        } else if (node.signatures) {
          return functionHtml(ctx, node)
        } else {
          return variableHtml(ctx, node)
        }
      })
    ])
  }).filter(group => group !== null)

  let tree = {
    type: 'root',
    children: treeChildren
  }

  return tree
}

function submenuName(node) {
  return node.name + (node.kindString === 'Function' ? '()' : '')
}

function toSubmenu(nodes) {
  let submenuNodes = nodes
    .filter(node => !EXCLUDED_SUBMENU_KINDS.has(node.kindString))
    .sort(byName)
  let submenuGroups = groupNodes(submenuNodes)

  let submenu = GROUPS_ORDER.map(groupName => {
    let group = submenuGroups[groupName]

    if (group === undefined) {
      return null
    }

    return {
      text: groupName,
      ul: group.map(node => ({
        code: submenuName(node),
        link: '#' + toSlug(node.name)
      }))
    }
  }).filter(group => group !== null)

  return submenu
}

export default async function buildApi(assets, layout, title, nodes) {
  let file = title.replace(/\s/g, '-').toLowerCase()
  let path = join(DIST, file, 'index.html')

  let end = step(`Building ${title} HTML`)
  let ctx = { file }

  if (title === 'Web API') {
    for (let node of nodes) {
      if (node.name === 'ReadonlyRef') continue
      if (
        isSource(node, join('logux-state', 'vue')) ||
        isSource(node, join('logux-client', 'vue'))
      ) {
        node.name = 'Vue.' + node.name
      } else if (
        isSource(node, join('logux-state', 'react')) ||
        isSource(node, join('logux-client', 'react'))
      ) {
        node.name = 'React.' + node.name
      }
    }
  }

  await makeDir(dirname(path))
  let tree = toTree(ctx, nodes)
  let submenu = toSubmenu(nodes)
  let html = await layout(`/${file}/`, submenu, title + ' / ', tree)
  await fs.writeFile(path, html)
  assets.add(path, html)

  end()
}
