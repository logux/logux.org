let remarkHighlight = require('remark-highlight.js')
let remarkRehype = require('remark-rehype')
let { readFile } = require('fs').promises
let remarkParse = require('remark-parse')
let unistVisit = require('unist-util-visit')
let rehypeRaw = require('rehype-raw')
let { join } = require('path')
let unified = require('unified')
let globby = require('globby')

let wrap = require('../lib/spinner')

const ROOT = join(__dirname, '..', '..', '..', 'logux')

function htmlFixer (file) {
  return tree => {
    tree.children = tree.children.filter(i => {
      if (i.tagName === 'h1') {
        i.editUrl = `https://github.com/logux/logux/edit/master/${ file }`
        i.noSlug = true
      }
      return i.type !== 'text' || i.value !== '\n'
    })
  }
}

async function readGuides () {
  let files = await globby('*/*.md', { cwd: ROOT, ignore: 'node_modules' })
  let guides = await Promise.all(files.map(async file => {
    let title = ''
    function convertor () {
      return tree => {
        unistVisit(tree, 'heading', node => {
          if (node.depth === 1) {
            title = node.children[0].value
          }
        })
        unistVisit(tree, 'link', node => {
          node.url = node.url
            .replace(/^..\//, '../../')
            .replace(/^.\//, '../')
            .replace(/\.md$/, '/')
        })
      }
    }
    let md = await readFile(join(ROOT, file))
    let tree = await unified().use(remarkParse).parse(md)
    tree = await unified()
      .use(remarkHighlight)
      .use(convertor)
      .use(remarkRehype, { allowDangerousHTML: true })
      .use(rehypeRaw)
      .use(htmlFixer, file)
      .run(tree)
    return { tree, title, file }
  }))
  return guides
}

module.exports = wrap(readGuides, 'Reading guides')
