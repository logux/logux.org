import { readFile, writeFile } from 'fs/promises'
import { join, relative } from 'path'

import { DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'
import hash from '../lib/hash.js'

async function injectCacheBuster(assets) {
  let servivePath = join(DIST, 'service.js')
  let serviceCode = await readFile(servivePath)

  let toCache = assets
    .map(i => {
      return (
        '/' +
        relative(DIST, i)
          .replace(/\\/g, '/')
          .replace(/(^|\/)index\.html$/, '$1')
      )
    })
    .filter(i => {
      return (
        i !== '/service.js' &&
        i !== '/uikit/' &&
        i !== '/favicon.ico' &&
        i !== '/robots.txt' &&
        !i.startsWith('/og.') &&
        !i.startsWith('/.well-known/')
      )
    })
    .sort()
  let cacheBuster = hash(
    toCache
      .filter(i => i.endsWith('/'))
      .map(i => assets.hash(join(DIST, i)))
      .join()
  )
  serviceCode = serviceCode.toString().replace('FILES', JSON.stringify(toCache))

  await writeFile(servivePath, `'${cacheBuster}';${serviceCode}`)
}

export default wrap(injectCacheBuster, 'Injecting cache buster to worker')
