import { Worker } from 'worker_threads'
import { join } from 'path'
import globby from 'globby'

import { PROJECTS, WORKERS } from '../lib/dirs.js'
import { run } from '../lib/spinner.js'

const JSDOCER = join(WORKERS, 'jsdocer.js')

export default async function readJsdoc (...projects) {
  let type = projects[0].replace(/^logux-/, '')

  let files = await run(`Looking for ${ type } JSDoc`, async () => {
    return Promise.all(projects.map(i => {
      return globby('**/*.js', {
        absolute: true,
        ignore: ['node_modules', 'test', 'coverage'],
        cwd: join(PROJECTS, i)
      })
    }))
  })

  return run(`Generating ${ type } JSDoc`, async () => {
    return new Promise((resolve, reject) => {
      let worker = new Worker(JSDOCER, { workerData: [type, files] })
      worker.on('message', resolve)
      worker.on('error', reject)
    })
  })
}
