let { writeFile, readFile } = require('fs').promises
let { promisify } = require('util')
let gzip = promisify(require('zlib').gzip)

let wrap = require('../lib/spinner')

async function compressFiles (assets) {
  await Promise.all(assets
    .get(/\.(js|css|ico|html|webmanifest|svg|txt)$/)
    .map(async path => {
      let content = await readFile(path)
      let compressed = await gzip(content, { level: 9 })
      await writeFile(path + '.gz', compressed)
    })
  )
}

module.exports = wrap(compressFiles, 'Compressing files')
