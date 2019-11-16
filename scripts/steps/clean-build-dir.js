let { existsSync } = require('fs')
let { promisify } = require('util')
let { join } = require('path')
let rimraf = promisify(require('rimraf'))

let wrap = require('../lib/spinner')

const DIST = join(__dirname, '..', '..', 'dist')

async function cleanBuildDir () {
  if (existsSync(DIST)) {
    await rimraf(join(DIST, '*'))
  }
}

module.exports = wrap(cleanBuildDir, 'Cleaning old files')
