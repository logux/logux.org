import { promises as fs } from 'fs'
import { join } from 'path'
import makeDir from 'make-dir'

import { SRC, DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

let FILES = ['logo.svg', 'favicon.ico', 'robots.txt', 'security.txt']

async function copyWellKnown (assets) {
  await makeDir(join(DIST, '.well-known'))
  await Promise.all(FILES.map(i => {
    let from = join(SRC, 'well-known', i)
    let to = join(DIST, i)
    if (i === 'security.txt') to = join(DIST, '.well-known', i)
    assets.add(to)
    return fs.copyFile(from, to)
  }))
}

export default wrap(copyWellKnown, 'Copying static files')
