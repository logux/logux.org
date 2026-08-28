import { all, createLowlight } from 'lowlight'
import { visit } from 'unist-util-visit'

let lowlight = createLowlight(all)

// Replacement for deprecated `remark-highlight.js`.
export default function remarkHighlight({ exclude, prefix } = {}) {
  return tree => {
    visit(tree, 'code', node => {
      let lang = node.lang
      if (!lang || exclude?.includes(lang)) return

      if (!node.data) node.data = {}
      let props = node.data.hProperties ?? (node.data.hProperties = {})

      node.data.hChildren = lowlight.highlight(lang, node.value, {
        prefix
      }).children
      props.className = [
        'hljs',
        ...(Array.isArray(props.className) ? props.className : []),
        'language-' + lang
      ]
    })
  }
}
