import { existsSync, promises as fs } from 'fs'
import { join } from 'path'
import { Worker } from 'worker_threads'

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

  await new Promise((resolve, reject) => {
    let worker = new Worker(DOWNLOADER, { workerData: [url, to] })
    worker.on('message', resolve)
    worker.on('error', reject)
  })
  await fs.rename(to, dir)
  end()
}
