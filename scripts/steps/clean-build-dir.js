import { deleteAsync } from 'del'
import { join } from 'path'

import wrap from '../lib/spinner.js'
import { DIST } from '../lib/dirs.js'

async function cleanBuildDir() {
  await deleteAsync(join(DIST, '*'), { dot: true })
}

export default wrap(cleanBuildDir, 'Cleaning old files')
