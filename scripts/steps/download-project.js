import { existsSync } from 'fs'
import { Worker } from 'worker_threads'
import { join } from 'path'

import { WORKERS, PROJECTS } from '../lib/dirs.js'
import { step } from '../lib/spinner.js'

const DOWNLOADER = join(WORKERS, 'downloader.js')

export default async function downloadProject (name) {
  let repo = name.replace(/^logux-/, '')
  let dir = join(PROJECTS, name)
  let to = join(dir, '..', `${ repo }-master`)
  if (existsSync(dir)) return

  let url = `https://github.com/logux/${ repo }/archive/master.zip`
  let end = step(`Downloading ${ url }`)

  try {
    await new Promise((resolve, reject) => {
      let worker = new Worker(DOWNLOADER, { workerData: [url, to, dir] })
      worker.on('message', resolve)
      worker.on('error', reject)
    })
  } catch (e) {
    end(e)
    throw e
  }
  end()
}
