let { join, dirname } = require('path')
let { existsSync } = require('fs')
let { Extract } = require('unzipper')
let { rename } = require('fs').promises
let { get } = require('https')

function download (url, body) {
  get(url, res => {
    if (res.statusCode >= 300 && res.statusCode <= 399) {
      download(res.headers.location, body)
    } else {
      body(res)
    }
  })
}

module.exports = async function downloadProject (name) {
  let dir = join(__dirname, '..', '..', '..', name)
  if (existsSync(dir)) return

  await new Promise((resolve, reject) => {
    download(`https://github.com/logux/${ name }/archive/master.zip`, res => {
      let extract = Extract({ path: dirname(dir) })
      res.pipe(extract)
      res.on('error', reject)
      extract.on('error', reject)
      extract.on('close', resolve)
    })
  })
  await rename(join(dir, '..', `${ name }-master`), dir)
}
