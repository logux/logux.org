import { promises as fs } from 'fs'
import remarkHighlight from 'remark-highlight.js'
import remarkRehype from 'remark-rehype'
import unistFlatmap from 'unist-util-flatmap'
import remarkParse from 'remark-parse'
import unistVisit from 'unist-util-visit'
import rehypeRaw from 'rehype-raw'
import { join } from 'path'
import unified from 'unified'
import globby from 'globby'

import { PROJECTS } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

const ROOT = join(PROJECTS, 'logux-docs')

function text (value) {
  return { type: 'text', value }
}

function span (cls, value) {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: [cls] },
    children: [text(value)]
  }
}

function highlightLines (node, cb) {
  if (!node.data) node.data = { }
  node.data.hChildren = node.value
    .split('\n')
    .map(cb)
    .flatMap((line, i) => i === 0 ? line : [text('\n'), ...line])
}

function iniandBashHighlight () {
  return tree => {
    unistVisit(tree, 'code', node => {
      if (node.lang === 'sh' || node.lang === 'bash') {
        highlightLines(node, line => line
          .split(' ')
          .map((word, i, all) => {
            if (i === 0 && (word === 'npx' || word === 'sudo')) {
              return span('code-block_keyword', word)
            } else if (
              i === 0 ||
              (i === 1 && all[0] === 'npx') ||
              (i === 1 && all[0] === 'npm' && word === 'i') ||
              (i === 1 && all[0] === 'yarn' && word === 'add')
            ) {
              return span('code-block_literal', word)
            } else {
              return text(word)
            }
          })
          .flatMap((word, i) => i === 0 ? word : [text(' '), word])
        )
      } else if (node.lang === 'ini') {
        highlightLines(node, line => {
          let [name, value] = line.split('=')
          return [
            span('code-block_params', name),
            text('='),
            span('code-block_string', value)
          ]
        })
      } else if (node.lang === 'diff') {
        highlightLines(node, line => {
          let code = line.slice(2)
          if (line[0] === '+') {
            return [span('code-block_addition', code)]
          } else if (line[0] === '-') {
            return [span('code-block_deletion', code)]
          } else {
            return [span('code-block_untouched', code)]
          }
        })
      }
    })
  }
}

function htmlFixer (file) {
  return tree => {
    tree.children = [
      {
        type: 'element',
        tagName: 'article',
        properties: { },
        children: tree.children.filter(i => {
          if (i.tagName === 'h1') {
            i.editUrl = `https://github.com/logux/docs/edit/master/${ file }`
            i.noSlug = true
          }
          return i.type !== 'text' || i.value !== '\n'
        })
      }
    ]
  }
}

function html (value) {
  return { type: 'html', value }
}

function npmToYarn (value) {
  return value
    .replace(/^npm i(nstall)? /, 'yarn add ')
    .replace(/--save-dev/, '--dev')
    .replace(/^npm /, 'yarn ')
}

async function readDocs () {
  let files = await globby('**/*.md', {
    cwd: ROOT, ignore: ['node_modules', 'README.md']
  })
  let guides = await Promise.all(files.map(async file => {
    let title = ''
    function convertor () {
      return tree => {
        unistFlatmap(tree, node => {
          if (node.lang === 'sh' && node.value.startsWith('npm ')) {
            return [
              html('<details><summary>npm</summary>'),
              node,
              html('</details>'),
              html('<details><summary>Yarn</summary>'),
              { type: 'code', lang: 'sh', value: npmToYarn(node.value) },
              html('</details>')
            ]
          } else {
            return [node]
          }
        })
        unistVisit(tree, node => {
          if (node.type === 'heading') {
            if (node.depth === 1) {
              title = node.children[0].value
            }
          } else if (node.type === 'link' || node.type === 'definition') {
            node.url = node.url
              .replace(/^..\//, '../../')
              .replace(/^.\//, '../')
              .replace(/\.md(#.+)?$/, '/$1')
          }
        })
      }
    }
    let md = await fs.readFile(join(ROOT, file))
    let tree = await unified().use(remarkParse).parse(md)
    tree = await unified()
      .use(convertor)
      .use(iniandBashHighlight)
      .use(remarkHighlight, {
        exclude: ['bash', 'sh', 'ini', 'diff'],
        prefix: 'code-block_'
      })
      .use(remarkRehype, { allowDangerousHTML: true })
      .use(rehypeRaw)
      .use(htmlFixer, file)
      .run(tree)
    return { tree, title, file }
  }))
  return guides
}

export default wrap(readDocs, 'Reading docs')
