import { parentPort, workerData } from 'worker_threads'
import { promisify } from 'util'
import { dirname } from 'path'
import unzipper from 'unzipper'
import { get } from 'https'
import child from 'child_process'

let exec = promisify(child.exec)

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

let [url, dir] = workerData

download(url, res => {
  let extract = unzipper.Extract({ path: dirname(dir) })
  res.pipe(extract)
  res.on('error', e => {
    throw e
  })
  extract.on('error', e => {
    throw e
  })
  extract.on('close', async () => {
    await exec('yarn install --production', { cwd: dir })
    parentPort.postMessage(true)
  })
})

process.on('unhandledRejection', e => {
  e.stack = `Downloading ${ url }\n${ e.stack }`
  throw e
})
