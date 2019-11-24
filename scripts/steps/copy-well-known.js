import { promises as fs } from 'fs'
import { join } from 'path'
import makeDir from 'make-dir'

import { SRC, DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

async function copyWellKnown (assets) {
  let from = join(SRC, 'well-known')
  let to = join(DIST, '.well-known')
  let files = ['favicon.ico', 'robots.txt']
  await makeDir(join(DIST, '.well-known'))
  await Promise.all(files
    .map(i => fs.copyFile(join(from, i), join(DIST, i)))
    .concat([
      fs.copyFile(join(from, 'security.txt.asc'), join(to, 'security.txt'))
    ]))
  for (let file of files) assets.add(join(DIST, file))
  assets.add(join(to, 'security.txt'))
}

export default wrap(copyWellKnown, 'Copying static files')
