let { writeFile } = require('fs').promises
let { terser } = require('rollup-plugin-terser')
let { rollup } = require('rollup')
let { join } = require('path')

const SRC = join(__dirname, '..', '..', 'src')

module.exports = async function repackScripts (assets) {
  let scripts = assets.get(/\.js$/).map(compiled => {
    let name = compiled.replace(/^.+[^\w](\w+)\.[\w\d]+\.js$/, '$1.js')
    return [join(SRC, name), compiled]
  })
  await Promise.all(scripts.map(async ([input, output]) => {
    let bundle = await rollup({
      input, plugins: [terser()]
    })
    let results = await bundle.generate({ format: 'iife' })
    await writeFile(output, results.output[0].code)
  }))
}
