let { copyFile } = require('fs').promises
let { join } = require('path')
let makeDir = require('make-dir')

const DIST = join(__dirname, '..', '..', 'dist')

module.exports = async function copyWellKnown (assets) {
  let wellFrom = join(__dirname, '..', '..', 'src', 'well-known')
  let wellTo = join(DIST, '.well-known')
  let files = ['favicon.ico', 'robots.txt']
  await makeDir(join(DIST, '.well-known'))
  await Promise.all(files
    .map(i => copyFile(join(wellFrom, i), join(DIST, i)))
    .concat([
      copyFile(join(wellFrom, 'security.txt.asc'), join(wellTo, 'security.txt'))
    ]))
  for (let file of files) assets.add(join(DIST, file))
  assets.add(join(wellTo, 'security.txt'))
}
