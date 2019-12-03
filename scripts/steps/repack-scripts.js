import injectProcessEnv from 'rollup-plugin-inject-process-env'
import { promises as fs } from 'fs'
import { join } from 'path'
import terser from 'rollup-plugin-terser'
import rollup from 'rollup'

import { SRC } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

async function repackScripts (assets) {
  let scripts = assets.get(/\.js$/).map(compiled => {
    let name
    if (compiled.endsWith('service.js')) {
      name = 'service.js'
    } else {
      name = compiled.replace(/^.+\W(\w+)\.\w+\.js$/, '$1.js')
    }
    return [join(SRC, name), compiled]
  })

  await Promise.all(scripts.map(async ([input, output]) => {
    let bundle = await rollup.rollup({
      input,
      plugins: [
        injectProcessEnv({ NODE_ENV: 'production' }),
        terser.terser()
      ]
    })
    let results = await bundle.generate({ format: 'iife' })
    await fs.writeFile(output, results.output[0].code)
  }))
}

export default wrap(repackScripts, 'Optimizing JS')
