import { promises as fs } from 'fs'
import { basename, join } from 'path'

import { SRC, DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'
import hash from '../lib/hash.js'

async function generateWebManifest (assets) {
  let json = JSON.parse(
    await fs.readFile(join(SRC, 'base', 'manifest.webmanifest'))
  )
  json.icons[0].src = '/' + basename(assets.find(/196\..*\.png$/))
  json.icons[1].src = '/' + basename(assets.find(/512\..*\.png$/))
  let text = JSON.stringify(json)
  let name = `manifest.${ hash(text) }.webmanifest`
  await fs.writeFile(join(DIST, name), text)
  assets.add(join(DIST, name))
  return { url: '/' + name, theme: json.theme_color }
}

export default wrap(generateWebManifest, 'Generating web manifest')
