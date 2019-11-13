let rehypeStringify = require('rehype-stringify')
let unistFilter = require('unist-util-filter')
let rehypeParse = require('rehype-parse')
let unistVisit = require('unist-util-visit')
let slugify = require('slugify')
let unified = require('unified')

function cleaner (removeAssets) {
  return tree => {
    unistVisit(tree, 'element', i => {
      if (i.tagName === 'article') {
        i.children = []
      }
    })
    if (!removeAssets) return tree
    return unistFilter(tree, 'element', i => {
      let props = i.properties || {}
      if (i.tagName === 'script') {
        return !removeAssets.test(props.src)
      } else if (i.tagName === 'link' && props.rel[0] === 'stylesheet') {
        return !removeAssets.test(props.href)
      } else {
        return true
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
      return tag('button', {
        'id': `sw${ id }tab${ i }`,
        'role': 'tab',
        'tabindex': i !== 0 && '-1',
        'aria-controls': `sw${ id }tab${ i }body`,
        'aria-selected': i === 0 && 'true'
      }, [
        { type: 'text', value: s[0] }
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
  let slugs = { }
  function toSlug (nodes) {
    let text = toText(nodes)
    let slug = slugify(text, { lower: true })
    if (slugs[slug]) {
      throw new Error(`Dublicate slug by "${ text }"`)
    }
    slugs[slug] = true
    return slug
  }

  return tree => {
    unistVisit(tree, 'element', (node, index, parent) => {
      let cls = node.properties.className || []
      if (node.tagName === 'p') {
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
          let slug = toSlug(node.children)
          node.properties.id = slug
          node.children = [
            tag('a', 'title_link', {
              title: 'Direct link to section',
              href: `#${ slug }`
            }, node.children)
          ]
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

module.exports = async function createLayout (uikit) {
  let guideHtml = await cleanPage(uikit)
  let apiHtml = await cleanPage(uikit, /\/guide\./)

  async function put (layout, title, tree) {
    let fixed = await unified()
      .use(converter)
      .run(tree)
    let html = await unified()
      .use(rehypeStringify)
      .stringify(fixed)
    return layout
      .replace(/<title>[^<]+/, `<title>${ title } / Logux`)
      .replace(/<article([^>]+)>/, `$&${ html }`)
  }

  return {
    async guide (title, tree) {
      return put(guideHtml, title, tree)
    },
    async api (title, tree) {
      return put(apiHtml, title, tree)
    }
  }
}
