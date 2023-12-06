import { readFile, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import zlib from 'node:zlib'

import wrap from '../lib/spinner.js'

let gzip = promisify(zlib.gzip)

async function compressFiles(assets) {
  await Promise.all(
    assets.get(/\.(js|css|ico|html|webmanifest|svg|txt)$/).map(async path => {
      let content = await readFile(path)
      let compressed = await gzip(content, { level: 9 })
      await writeFile(path + '.gz', compressed)
    })
  )
}

export default wrap(compressFiles, 'Compressing files')
