let { writeFile, readFile } = require('fs').promises
let { promisify } = require('util')
let zlib = require('zlib')

let gzip = promisify(zlib.gzip)

module.exports = async function compressFiles (spin, assets) {
  spin.add('compress-files', { text: 'Compressing files' })
  await Promise.all(assets
    .get(/\.(js|css|ico|html|webmanifest|svg|txt)$/)
    .map(async path => {
      let content = await readFile(path)
      let compressed = await gzip(content, { level: 9 })
      await writeFile(path + '.gz', compressed)
    })
  )
  spin.succeed('compress-files', { text: 'Files compressed' })
}
