let { join, dirname } = require('path')
let rehypeStringify = require('rehype-stringify')
let { writeFile } = require('fs').promises
let unistVisit = require('unist-util-visit')
let rehypeParse = require('rehype-parse')
let unified = require('unified')
let makeDir = require('make-dir')

const DIST = join(__dirname, '..', '..', 'dist')

function cleaner () {
  return tree => {
    unistVisit(tree, 'element', node => {
      if (node.tagName === 'article') {
        node.children = []
      }
    })
  }
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

function converter ({ file }) {
  let slugs = { }
  function toSlug (nodes) {
    let text = toText(nodes)
    let slug = text
      .replace(/[^\w\d\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
    if (slugs[slug]) {
      throw new Error(`Dublicate slug by "${ text }" from ${ file }`)
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
      } else if (node.tagName === 'code') {
        if (parent.tagName === 'pre') {
          delete node.properties.className
        } else if (parent.tagName === 'a') {
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
      } else if (node.tagName === 'h1' && !node.properties.className) {
        node.tagName = 'div'
        node.properties = { className: ['edit'] }
        node.children = [
          tag('h1', 'title', node.children),
          tag('a', 'edit_link', {
            title: 'Edit the page on GitHub',
            href: `https://github.com/logux/logux/edit/master/${ file }`
          })
        ]
      } else if (node.tagName === 'h2' || node.tagName === 'h3') {
        let slug = toSlug(node.children)
        node.properties.className = ['title']
        node.properties.id = slug
        node.children = [
          tag('a', 'title_link', {
            title: 'Direct link to section',
            href: `#${ slug }`
          }, node.children)
        ]
      } else if (cls.some(i => i.startsWith('hljs-'))) {
        node.properties.className = node.properties.className.map(i => {
          return i.replace(/^hljs-/, 'code-block_')
        })
      }
    })
  }
}

async function put (layout, page) {
  let fixed = await unified()
    .use(converter, { file: page.file })
    .run(page.tree)
  let html = await unified()
    .use(rehypeStringify)
    .stringify(fixed)
  return layout
    .replace(/<title>[^<]+/, `<title>${ page.title } / Guide / Logux`)
    .replace(/<article([^>]+)>/, `$&${ html }`)
}

async function cleanContent (html) {
  let cleaned = await unified()
    .use(rehypeParse)
    .use(cleaner)
    .use(rehypeStringify)
    .process(html)
  return cleaned.contents
}

module.exports = async function buildPages (assets, uikit, guides) {
  let layout = await cleanContent(uikit)
  await Promise.all(guides.map(async page => {
    let path = join(DIST, join(page.file.replace(/\.md$/, ''), 'index.html'))
    let html = await put(layout, page)
    await makeDir(dirname(path))
    await writeFile(path, html)
    assets.add(path)
  }))
}
