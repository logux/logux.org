let { parentPort, workerData } = require('worker_threads')
let { Extract } = require('unzipper')
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

let [url, path] = workerData

download(url, res => {
  let extract = Extract({ path })
  res.pipe(extract)
  res.on('error', e => {
    throw e
  })
  extract.on('error', e => {
    throw e
  })
  extract.on('close', () => {
    parentPort.postMessage(true)
  })
})
