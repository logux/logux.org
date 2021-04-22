import { promises as fs } from 'fs'
import { join } from 'path'
import copyDir from 'recursive-copy'
import makeDir from 'make-dir'

import { SRC, DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

let FILES = ['branding/', 'favicon.ico', 'robots.txt', 'security.txt']

async function copyWellKnown(assets) {
  await makeDir(join(DIST, '.well-known'))
  await Promise.all(
    FILES.map(async i => {
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
        await fs.copyFile(from, to)
      }
    })
  )
}

export default wrap(copyWellKnown, 'Copying static files')
