import { parentPort, workerData } from 'worker_threads'
import unzipper from 'unzipper'
import { get } from 'https'

function download (url, body) {
  get(url, res => {
    if (res.statusCode >= 300 && res.statusCode <= 399) {
      download(res.headers.location, body)
    } else if (res.statusCode >= 200 && res.statusCode <= 299) {
      body(res)
    } else {
      throw new Error(`${ res.statusCode } responce at ${ url }`)
    }
  })
}

let [url, path] = workerData

download(url, res => {
  let extract = unzipper.Extract({ path })
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

process.on('unhandledRejection', e => {
  e.stack = `Downloading ${ url }\n${ e.stack }`
  throw e
})
