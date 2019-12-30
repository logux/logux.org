import { join } from 'path'
import del from 'del'

import wrap from '../lib/spinner.js'
import { DIST } from '../lib/dirs.js'

async function cleanBuildDir () {
  await del(join(DIST, '*'), { dot: true })
}

export default wrap(cleanBuildDir, 'Cleaning old files')
