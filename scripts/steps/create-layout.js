let rehypeStringify = require('rehype-stringify')
let unistFilter = require('unist-util-filter')
let rehypeParse = require('rehype-parse')
let unistVisit = require('unist-util-visit')
let slugify = require('slugify')
let unified = require('unified')

let wrap = require('../lib/spinner')

function cleaner (removeAssets) {
  return tree => {
    unistVisit(tree, 'element', node => {
      let cls = node.properties.className || []
      if (node.tagName === 'article') {
        node.children = []
      } else if (node.tagName === 'a') {
        if (cls.some(i => i === 'menu_link')) {
          node.properties.className = cls.filter(i => i !== 'is-current')
        }
      } else if (cls[0] === 'submenu') {
        node.children = []
      }
    })
    if (!removeAssets) return tree
    return unistFilter(tree, 'element', node => {
      let props = node.properties || {}
      if (node.tagName === 'script') {
        return !removeAssets.test(props.src)
      } else if (node.tagName === 'link' && props.rel[0] === 'stylesheet') {
        return !removeAssets.test(props.href)
      } else {
        return true
      }
    })
  }
}

function checker (title) {
  return tree => {
    let ids = new Set()
    unistVisit(tree, 'element', node => {
      let id = node.properties.id
      if (id) {
        if (ids.has(id)) throw new Error(`Dublicate ID #${ id } in ${ title }`)
        ids.add(id)
      }
    })
    unistVisit(tree, 'element', node => {
      let href = node.properties.href
      if (href && href.startsWith('#')) {
        if (!ids.has(href.slice(1))) {
          throw new Error(`${ title } has no ${ href } ID`)
        }
      }
    })
  }
}

async function cleanPage (html, removeAssets) {
  let cleaned = await unified()
    .use(rehypeParse)
    .use(cleaner, removeAssets)
    .use(rehypeStringify)
    .process(html)
  return cleaned.contents
}

function tag (tagName, cls, properties, children = []) {
  if (Array.isArray(properties)) {
    children = properties
    properties = { }
  }
  if (typeof cls === 'object') {
    properties = cls
  } else {
    properties.className = [cls]
  }
  return { type: 'element', tagName, properties, children }
}

function toText (nodes) {
  return nodes.map(i => {
    if (i.type === 'text') {
      return i.value
    } else {
      return toText(i.children)
    }
  }).join('')
}

function switcherToHTML (id, switchers) {
  return tag('div', 'switcher', [
    tag('div', 'switcher_tabs', { role: 'tablist' }, switchers.map((s, i) => {
      return tag('li', {
        className: i === 0 ? ['is-open'] : [],
        role: 'presentation'
      }, [
        tag('button', {
          'id': `sw${ id }tab${ i }`,
          'role': 'tab',
          'tabindex': i !== 0 && '-1',
          'aria-controls': `sw${ id }tab${ i }body`,
          'aria-selected': i === 0 && 'true'
        }, [
          { type: 'text', value: s[0] }
        ])
      ])
    })),
    ...switchers.map((s, i) => {
      return tag('section', {
        'id': `sw${ id }tab${ i }body`,
        'role': 'tabpanel',
        'hidden': i !== 0,
        'aria-labelledby': `sw${ id }tab${ i }`
      }, s[1])
    })
  ])
}

function converter () {
  function toSlug (nodes) {
    return slugify(toText(nodes), { lower: true })
      .replace(/":/g, '')
      .replace(/node\.js/g, 'nodejs')
  }

  return tree => {
    unistVisit(tree, 'element', (node, index, parent) => {
      let cls = node.properties.className || []
      if (node.tagName === 'article') {
        node.properties.className = ['text']
        node.children.push({
          type: 'element',
          tagName: 'hr',
          properties: { className: ['line'] }
        })
      } else if (node.tagName === 'p') {
        node.properties.className = ['text_block']
      } else if (node.tagName === 'ul' || node.tagName === 'ol') {
        node.properties.className = ['list']
      } else if (node.tagName === 'table') {
        node.properties.className = ['table']
      } else if (node.tagName === 'pre') {
        node.properties.className = ['code-block']
      } else if (node.tagName === 'kbd') {
        node.properties.className = ['code']
      } else if (node.tagName === 'code' && !node.noClass) {
        if (parent.tagName === 'pre') {
          delete node.properties.className
        } else if (parent.tagName === 'a' && !parent.properties.className) {
          parent.properties.className = ['code']
        } else {
          node.properties.className = ['code']
        }
      } else if (node.tagName === 'details') {
        let converted = []
        let switchers = []
        let onPage = 0
        for (let child of parent.children) {
          if (child.tagName === 'details') {
            switchers.push([
              toText(child.children[0].children),
              child.children.slice(1)
            ])
          } else if (switchers.length > 0) {
            converted.push(switcherToHTML(onPage++, switchers))
            switchers = []
            converted.push(child)
          } else {
            converted.push(child)
          }
        }
        if (switchers.length > 0) {
          converted.push(switcherToHTML(onPage++, switchers))
        }
        parent.children = converted
      } else if (/^h[123]$/.test(node.tagName) && !node.properties.className) {
        node.properties.className = ['title']
        if (!node.noSlug) {
          let slug = node.slug ? node.slug : toSlug(node.children)
          node.properties.id = slug
          node.children = [
            tag('a', 'title_link', {
              title: 'Direct link to section',
              href: `#${ slug }`
            }, node.children)
          ]
        }
        if (node.sourceUrl) {
          node.children = [
            tag('a', 'title_source', {
              href: node.sourceUrl, title: 'Source code'
            })
          ].concat(node.children)
        }
        if (node.editUrl) {
          node.tagName = 'div'
          node.children = [
            tag('h1', 'title', node.properties, node.children),
            tag('a', 'edit_link', {
              title: 'Edit the page on GitHub',
              href: node.editUrl
            })
          ]
          node.properties = { className: ['edit'] }
        }
      } else if (cls.some(i => i.startsWith('hljs-'))) {
        node.properties.className = node.properties.className.map(i => {
          return i.replace(/^hljs-/, 'code-block_')
        })
      } else if (node.tagName === 'a' && parent.tagName === 'strong') {
        if (toText(node.children) === 'Next chapter →') {
          parent.tagName = 'a'
          parent.properties = node.properties
          parent.children = node.children
          parent.properties.className = ['button']
        }
      }
    })
  }
}

async function createLayout (uikit) {
  let guideHtml = await cleanPage(uikit)
  let apiHtml = await cleanPage(uikit, /\/guide\./)

  async function put (layout, categoryUrl, title, tree) {
    let fixed = await unified()
      .use(converter)
      .use(checker, title)
      .run(tree)
    let html = await unified()
      .use(rehypeStringify)
      .stringify(fixed)
    return layout
      .replace(
        `class="menu_link" href="${ categoryUrl }"`,
        `class="menu_link is-current" href="${ categoryUrl }"`
      )
      .replace(/<title>[^<]+/, `<title>${ title } / Logux`)
      .replace(/<\/article>/, '')
      .replace(/<article([^>]+)>/, `${ html }`)
  }

  return {
    async doc (categoryUrl, title, tree) {
      return put(guideHtml, categoryUrl, title, tree)
    },
    async api (categoryUrl, title, tree) {
      return put(apiHtml, categoryUrl, title, tree)
    }
  }
}

module.exports = wrap(createLayout, 'Creating layout')
