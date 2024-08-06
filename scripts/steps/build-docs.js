import capitalize from 'capitalize'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'

import { DIST, PROJECTS } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

function toTitle(file) {
  if (file === 'starting') file = 'starting-project'
  if (file === 'spec') file = 'specification'
  if (file === 'node-server') file = 'node.js-server'
  return capitalize(file)
    .replace(/-\w/g, i => ' ' + i.slice(1).toUpperCase())
    .replace(/Ws/g, 'Web Socket')
    .replace(/Typescript/g, 'TypeScript')
    .replace(/Cross Tab/g, 'Cross-Tab')
    .replace(/Backend/g, 'Back-end')
}

async function buildDocs(assets, layout, guides) {
  let json = await readFile(join(PROJECTS, 'logux-docs', 'order.json'))
  let order = JSON.parse(json)

  let submenus = {}
  for (let category in order) {
    if (category === 'recipes') {
      submenus[category] = order[category].map(i => ({
        link: `/${category}/${i}/`,
        text: toTitle(i)
      }))
    } else {
      submenus[category] = []
      let lastSection
      let lastList
      for (let i of order[category]) {
        let [section, name] = i.split('/')
        if (section !== lastSection) {
          lastList = []
          submenus[category].push({
            ol: lastList,
            text: toTitle(section)
          })
          lastSection = section
        }
        lastList.push({
          link: `/${category}/${section}/${name}/`,
          text: toTitle(name)
        })
      }
    }
  }

  function findCurrent(dirs) {
    let url = '/' + dirs.split(sep).join('/') + '/'
    return i => {
      return { ...i, isCurrent: url === i.link }
    }
  }

  await Promise.all(
    guides.map(async page => {
      let categoryUrl, submenu, title
      let dirs = join(page.file.replace(/\.md$/, ''))
      if (page.file === 'README.md') {
        dirs = ''
        categoryUrl = false
        submenu = submenus.guide
      } else if (dirname(page.file) === 'recipes') {
        categoryUrl = '/recipes/authentication/'
        submenu = submenus.recipes.map(findCurrent(dirs))
      } else if (dirname(dirname(page.file)) === 'protocols') {
        categoryUrl = '/protocols/ws/spec/'
        submenu = submenus.protocols.map(i => {
          return { ...i, ol: i.ol.map(findCurrent(dirs)) }
        })
      } else {
        categoryUrl = '/guide/architecture/core/'
        submenu = submenus.guide.map(i => {
          return { ...i, ol: i.ol.map(findCurrent(dirs)) }
        })
      }
      title = dirs
        .split(sep)
        .reverse()
        .map(i => toTitle(i))
        .join(' / ')
      if (title !== '') title += ' / '
      let html = await layout(categoryUrl, submenu, title, page.tree)
      let path = join(DIST, dirs, 'index.html')
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, html)
      assets.add(path, html)
    })
  )
}

export default wrap(buildDocs, 'Building docs HTML')
