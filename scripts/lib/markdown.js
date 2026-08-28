import rehypeRemark from 'rehype-remark'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import { filter } from 'unist-util-filter'
import { visit } from 'unist-util-visit'

export const SITE = 'https://logux.org'

// Pages are directories, so the twin of `/guide/core/` is `/guide/core.md`
export function markdownUrl(page) {
  return page === '' ? '/index.md' : `/${page}.md`
}

// The twin sits one level above the page, so relative URLs are resolved.
// Icon-only links, like the “Edit on GitHub” pencil, become empty.
function fixLinks(base) {
  return tree => {
    visit(tree, ['definition', 'image', 'link'], node => {
      if (!/^([a-z][\w+.-]*:|[#/])/i.test(node.url)) {
        node.url = new URL(node.url, SITE + base).href
      }
    })
    return filter(tree, i => i.type !== 'link' || i.children.length > 0)
  }
}

// API and Branding pages have no Markdown sources, so their twin comes
// from the same tree the layout renders: still a single source of truth.
export async function treeToMarkdown(tree, page) {
  let processor = unified()
    .use(rehypeRemark)
    .use(fixLinks, `/${page}/`)
    .use(remarkGfm)
    .use(remarkStringify, { bullet: '-' })
  return String(processor.stringify(await processor.run(tree)))
}
