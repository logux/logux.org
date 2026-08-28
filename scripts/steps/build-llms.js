import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { DIST, PROJECTS } from '../lib/dirs.js'
import { markdownUrl, SITE } from '../lib/markdown.js'
import wrap from '../lib/spinner.js'

const HINT =
  'Every page has a Markdown twin: add `.md` to the page URL, ' +
  'or ask for the page itself with `Accept: text/markdown`.'

// `llms.txt` is a curated map of the site, not a sitemap. Guides describe
// themselves by their first sentence, but the home page and the generated
// pages need a summary written for this list.
const HOME = 'Overview of Logux with client and server examples.'

const SECTIONS = {
  API: [
    [
      'Web API',
      'web-api',
      'Reference for `@logux/client` with React, Vue, and Preact bindings.'
    ],
    [
      'Node API',
      'node-api',
      'Reference for `@logux/server` and the Logux Core it is built on.'
    ]
  ],
  Optional: [
    ['Branding', 'branding', 'Logux logo, font, and colors to download.']
  ]
}

function capitalize(str) {
  return str.slice(0, 1).toUpperCase() + str.slice(1)
}

function item(title, page, summary) {
  let url = SITE + markdownUrl(page)
  return summary ? `- [${title}](${url}): ${summary}` : `- [${title}](${url})`
}

async function buildLlms(assets, guides) {
  let json = await readFile(join(PROJECTS, 'logux-docs', 'order.json'))
  let order = JSON.parse(json)
  let byFile = new Map(guides.map(i => [i.file, i]))

  let home = byFile.get('README.md')
  let lines = ['# Logux', '', `> ${home.summary}`, '', HINT]

  for (let category in order) {
    lines.push('', `## ${capitalize(category)}`, '')
    if (category === 'guide') lines.push(item(home.title, '', HOME))
    for (let name of order[category]) {
      let page = `${category}/${name}`
      let guide = byFile.get(`${page}.md`)
      if (guide) lines.push(item(guide.title, page, guide.summary))
    }
  }

  for (let section in SECTIONS) {
    lines.push('', `## ${section}`, '')
    for (let [title, page, summary] of SECTIONS[section]) {
      lines.push(item(title, page, summary))
    }
  }

  let text = lines.join('\n') + '\n'
  let path = join(DIST, 'llms.txt')
  await writeFile(path, text)
  assets.add(path, text)
}

export default wrap(buildLlms, 'Building llms.txt')
