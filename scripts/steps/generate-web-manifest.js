import { promises as fs } from 'fs'
import { join } from 'path'

import { SRC, DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'
import hash from '../lib/hash.js'

async function generateWebManifest(assets) {
  let json = JSON.parse(
    await fs.readFile(join(SRC, 'base', 'manifest.webmanifest'))
  )
  let sizes = ['192', '512']
  let icons = await Promise.all(
    sizes.map(async size => {
      let content = await fs.readFile(join(SRC, 'base', `${size}.png`))
      let hashed = `${size}.${hash(content)}.png`
      await fs.writeFile(join(DIST, hashed), content)
      assets.add(join(DIST, hashed))
      return `/${hashed}`
    })
  )
  json.icons[0].src = icons[0]
  json.icons[1].src = icons[1]
  let text = JSON.stringify(json)
  let name = `manifest.${hash(text)}.webmanifest`
  await fs.writeFile(join(DIST, name), text)
  assets.add(join(DIST, name))
  return { url: '/' + name, theme: json.theme_color }
}

export default wrap(generateWebManifest, 'Generating web manifest')
