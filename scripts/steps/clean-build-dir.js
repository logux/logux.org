import { deleteAsync } from 'del'
import { join } from 'node:path'

import { DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

async function cleanBuildDir() {
  await deleteAsync(join(DIST, '*'), { dot: true })
}

export default wrap(cleanBuildDir, 'Cleaning old files')
