import rehypeStringify from 'rehype-stringify'
import unistFilter from 'unist-util-filter'
import rehypeParse from 'rehype-parse'
import unistVisit from 'unist-util-visit'
import slugify from 'slugify'
import unified from 'unified'

import wrap from '../lib/spinner.js'

function cleaner ({ chatUsers, removeAssets }) {
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
      } else if (cls[0] === 'menu_extra') {
        node.children = [{ type: 'text', value: `(${ chatUsers } people)` }]
      }
    })
    let articles = 0
    return unistFilter(tree, 'element', node => {
      let props = node.properties || { }
      if (node.tagName === 'article') {
        articles += 1
        return articles === 1
      } if (node.tagName === 'script') {
        return !removeAssets.some(i => props.src.includes(i))
      } else if (node.tagName === 'link' && props.rel[0] === 'stylesheet') {
        return !removeAssets.some(i => props.href.includes(i))
      } else if (node.tagName === 'link' && props.rel[0] === 'preload') {
        return !removeAssets.some(i => props.href.includes(i))
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

async function cleanPage (html, chatUsers, removeAssets) {
  let cleaned = await unified()
    .use(rehypeParse)
    .use(cleaner, { chatUsers, removeAssets })
    .use(rehypeStringify)
    .process(html)
  return cleaned.contents
}

function tag (tagName, cls, properties = { }, children = []) {
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
    unistVisit(tree, 'text', node => {
      node.value = node.value.replace(
        /(^|\s)(the|a|for|in|an|to|if|so|when|with|by|and|or|is|this) /gi,
        '$1$2 '
      )
    })
    unistVisit(tree, 'element', (node, index, parent) => {
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
      } else if (/^h[1-3]$/.test(node.tagName) && !node.properties.className) {
        unistVisit(node, 'element', i => {
          if (i.tagName === 'code') i.noClass = true
        })
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
            tag('a', 'source', {
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
      } else if (node.tagName === 'a' && parent.tagName === 'p') {
        if (toText(node.children) === 'Next chapter') {
          parent.tagName = 'div'
          parent.properties.className = ['next']
          node.properties.className = ['button']
          node.children.push(tag('span', 'next_icon'))
        }
      }
    })
  }
}

function submenuItem (node) {
  let text = []
  if (node.code) {
    let code = node.code
    if (code.startsWith('.') || code.startsWith('#')) {
      text.push(tag('span', 'submenu_extra', [
        { type: 'text', value: code.slice(0, 1) }
      ]))
      code = code.slice(1)
    }
    if (code.endsWith('()')) {
      text.push(
        { type: 'text', value: code.slice(0, -2) },
        tag('span', 'submenu_extra', [{ type: 'text', value: '()' }])
      )
    } else {
      text.push({ type: 'text', value: code })
    }
    text = [tag('code', { }, text)]
  } else {
    text = [{ type: 'text', value: node.text }]
  }
  if (node.isCurrent) {
    return tag('div', { className: ['submenu_text', 'is-current'] }, text)
  } else if (node.link) {
    return tag('a', 'submenu_link', { href: node.link }, text)
  } else {
    return tag('div', 'submenu_text', text)
  }
}

function generateSubmenu (links) {
  return {
    type: 'root',
    children: links.map(i => {
      let list = []
      list.push(submenuItem(i))
      if (i.ul || i.ol) {
        list.push(
          tag(i.ul ? 'ul' : 'ol', { }, (i.ul || i.ol).map(j => {
            return tag('li', { }, [submenuItem(j)])
          }))
        )
      }
      return tag('li', { className: (i.ul || i.ol) ? [] : ['is-flat'] }, list)
    })
  }
}

async function createLayout (uikit, chatUsers) {
  return async function (categoryUrl, links, title, tree) {
    let fixed = await unified()
      .use(converter)
      .use(checker, title)
      .run(tree)
    let submenu = await unified()
      .use(rehypeStringify)
      .stringify(generateSubmenu(links))
    let html = await unified()
      .use(rehypeStringify)
      .stringify(fixed)
    let ignore = []
    if (!html.includes(' class="source"')) ignore.push('/github.')
    if (!html.includes(' class="next"')) ignore.push('/right.')
    if (!html.includes(' class="switcher"')) ignore.push('/switcher.')
    if (!html.includes(' class="asset"')) ignore.push('/branding.')
    if (!html.includes(' class="title_link"')) ignore.push('/link.')
    let layout = await cleanPage(uikit, chatUsers, ignore)
    return layout
      .replace(
        `class="menu_link" href="${ categoryUrl }"`,
        'class="menu_link is-current"'
      )
      .replace('<ul class="submenu">', '$&' + submenu)
      .replace(/<title>[^<]+/, `<title>${ title } / Logux`)
      .replace(/<\/article>/, '')
      .replace(/<article([^>]+)>/, `${ html }`)
  }
}

export default wrap(createLayout, 'Creating layout')
