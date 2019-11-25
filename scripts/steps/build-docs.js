import { join, dirname, sep } from 'path'
import { promises as fs } from 'fs'
import capitalize from 'capitalize'
import makeDir from 'make-dir'

import { DIST, PROJECTS } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

function toTitle (file) {
  if (file === 'starting') file = 'starting-project'
  if (file === 'spec') file = 'specification'
  if (file === 'node-server') file = 'node.js-server'
  return capitalize(file)
    .replace(/-\w/, i => ' ' + i.slice(1).toUpperCase())
    .replace('Ws', 'Web Socket')
    .replace('Backend', 'Back-end')
}

async function buildDocs (assets, layout, guides) {
  let json = await fs.readFile(join(PROJECTS, 'logux-docs', 'order.json'))
  let order = JSON.parse(json)

  let submenus = { }
  for (let category in order) {
    if (category === 'recipes') {
      submenus[category] = order[category].map(i => ({
        text: toTitle(i),
        link: `/${ category }/${ i }/`
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
            text: toTitle(section),
            ol: lastList
          })
          lastSection = section
        }
        lastList.push({
          text: toTitle(name),
          link: `/${ category }/${ section }/${ name }/`
        })
      }
    }
  }

  function findCurrent (dirs) {
    let url = '/' + dirs.split(sep).join('/') + '/'
    return i => {
      return { ...i, isCurrent: url === i.link }
    }
  }

  await Promise.all(guides.map(async page => {
    let title, categoryUrl, submenu
    let dirs = join(page.file.replace(/\.md$/, ''))
    if (dirname(page.file) === 'recipes') {
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
    title = dirs.split(sep).reverse().map(i => toTitle(i)).join(' / ')
    let html = await layout.doc(categoryUrl, submenu, title, page.tree)
    let path = join(DIST, dirs, 'index.html')
    await makeDir(dirname(path))
    await fs.writeFile(path, html)
    assets.add(path)
  }))
}

export default wrap(buildDocs, 'Building docs HTML')
