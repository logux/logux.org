let { join, dirname } = require('path')
let { existsSync } = require('fs')
let { Extract } = require('unzipper')
let { rename } = require('fs').promises
let { get } = require('https')

let { step } = require('../lib/spinner')

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
  let repo = name.replace(/^logux-/, '')
  let dir = join(__dirname, '..', '..', '..', name)
  if (existsSync(dir)) return

  let url = `https://github.com/logux/${ repo }/archive/master.zip`
  let end = step(`Downloading ${ url }`)

  await new Promise((resolve, reject) => {
    download(url, res => {
      let extract = Extract({ path: dirname(dir) })
      res.pipe(extract)
      res.on('error', reject)
      extract.on('error', reject)
      extract.on('close', resolve)
    })
  })
  await rename(join(dir, '..', `${ repo }-master`), dir)
  end()
}
