import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

async function cleanBuildDir() {
  await rm(join(DIST), { force: true, recursive: true })
}

export default wrap(cleanBuildDir, 'Cleaning old files')
