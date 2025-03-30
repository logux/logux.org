import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import copyDir from 'recursive-copy'

import { DIST, ROOT, SRC } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

const FILES = ['branding/', 'favicon.ico', 'robots.txt', 'security.txt']
const CONFIGS = ['_headers', '_redirects']

async function copyWellKnown(assets) {
  await mkdir(join(DIST, '.well-known'), { recursive: true })
  await Promise.all([
    ...FILES.map(async i => {
      if (i.endsWith('/')) {
        let from = join(SRC, 'well-known', i.slice(0, -1))
        let to = join(DIST, i.slice(0, -1))
        let files = await copyDir(from, to)
        for (let file of files) {
          if (file.dest !== to) {
            assets.add(file.dest)
          }
        }
      } else {
        let from = join(SRC, 'well-known', i)
        let to = join(DIST, i)
        if (i === 'security.txt') to = join(DIST, '.well-known', i)
        assets.add(to)
        await copyFile(from, to)
      }
    }),
    ...CONFIGS.map(async i => {
      let from = join(ROOT, i)
      let to = join(DIST, i)
      await copyFile(from, to)
    })
  ])
}

export default wrap(copyWellKnown, 'Copying static files')
