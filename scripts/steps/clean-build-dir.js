let { existsSync } = require('fs')
let { promisify } = require('util')
let { join } = require('path')
let rimraf = promisify(require('rimraf'))

const DIST = join(__dirname, '..', '..', 'dist')

module.exports = async function cleanBuildDir () {
  if (existsSync(DIST)) {
    await rimraf(join(DIST, '*'))
  }
}
