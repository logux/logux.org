let { join, dirname } = require('path')
let { existsSync } = require('fs')
let { Worker } = require('worker_threads')
let { rename } = require('fs').promises

let { step } = require('../../lib/spinner')

const WORKER = join(__dirname, 'worker.js')

module.exports = async function downloadProject (name) {
  let repo = name.replace(/^logux-/, '')
  let dir = join(__dirname, '..', '..', '..', '..', name)
  if (existsSync(dir)) return

  let url = `https://github.com/logux/${ repo }/archive/master.zip`
  let end = step(`Downloading ${ url }`)

  await new Promise((resolve, reject) => {
    let worker = new Worker(WORKER, { workerData: [url, dirname(dir)] })
    worker.on('message', resolve)
    worker.on('error', reject)
  })
  await rename(join(dir, '..', `${ repo }-master`), dir)
  end()
}
