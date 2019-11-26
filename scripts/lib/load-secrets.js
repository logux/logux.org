import { promises as fs } from 'fs'
import { join } from 'path'

import { ROOT } from './dirs.js'

let cache

export default async function loadSecrets () {
  if (process.env.GITTER_TOKEN) {
    return {
      gitter: {
        roomId: process.env.GITTER_ROOM_ID,
        token: process.env.GITTER_TOKEN
      }
    }
  }
  if (!cache) {
    cache = JSON.parse(await fs.readFile(join(ROOT, 'secrets.json')))
  }
  return cache
}
