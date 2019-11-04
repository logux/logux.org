let { writeFile, readFile } = require('fs').promises
let { basename, join } = require('path')
let crypto = require('crypto')

const DIST = join(__dirname, '..', '..', 'dist')
const SRC = join(__dirname, '..', '..', 'src')

module.exports = async function generateWebManifest (assets) {
  let json = JSON.parse(
    await readFile(join(SRC, 'base', 'manifest.webmanifest'))
  )
  json.icons[0].src = '/' + basename(assets.find(/196\..*\.png$/))
  json.icons[1].src = '/' + basename(assets.find(/512\..*\.png$/))
  let text = JSON.stringify(json)
  let hash = crypto.createHash('md5').update(text).digest('hex').slice(0, 8)
  let name = `manifest.${ hash }.webmanifest`
  await writeFile(join(DIST, name), text)
  assets.add(join(DIST, name))
  return { url: '/' + name, theme: json.theme_color }
}
