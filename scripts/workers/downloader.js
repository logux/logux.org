import { parentPort, workerData } from 'worker_threads'
import { Extract } from 'unzipper'
import { get } from 'https'

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
