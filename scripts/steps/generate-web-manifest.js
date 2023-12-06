import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { DIST, SRC } from '../lib/dirs.js'
import hash from '../lib/hash.js'
import wrap from '../lib/spinner.js'

async function generateWebManifest(assets) {
  let json = JSON.parse(
    await readFile(join(SRC, 'base', 'manifest.webmanifest'))
  )
  let sizes = ['192', '512']
  let icons = await Promise.all(
    sizes.map(async size => {
      let content = await readFile(join(SRC, 'base', `${size}.png`))
      let hashed = `${size}.${hash(content)}.png`
      await writeFile(join(DIST, hashed), content)
      assets.add(join(DIST, hashed))
      return `/${hashed}`
    })
  )
  json.icons[0].src = icons[0]
  json.icons[1].src = icons[1]
  let text = JSON.stringify(json)
  let name = `manifest.${hash(text)}.webmanifest`
  await writeFile(join(DIST, name), text)
  assets.add(join(DIST, name))
  return { theme: json.theme_color, url: '/' + name }
}

export default wrap(generateWebManifest, 'Generating web manifest')
