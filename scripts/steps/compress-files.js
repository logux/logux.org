import { promises as fs } from 'fs'
import { promisify } from 'util'
import zlib from 'zlib'

import wrap from '../lib/spinner.js'

let gzip = promisify(zlib.gzip)

async function compressFiles (assets) {
  await Promise.all(
    assets.get(/\.(js|css|ico|html|webmanifest|svg|txt)$/).map(async path => {
      let content = await fs.readFile(path)
      let compressed = await gzip(content, { level: 9 })
      await fs.writeFile(path + '.gz', compressed)
    })
  )
}

export default wrap(compressFiles, 'Compressing files')
