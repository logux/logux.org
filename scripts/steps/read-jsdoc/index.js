let { Worker } = require('worker_threads')
let { join } = require('path')
let globby = require('globby')

let { run } = require('../../lib/spinner')

const PROJECTS = join(__dirname, '..', '..', '..', '..')
const WORKER = join(__dirname, 'worker.js')

module.exports = async function readJsdoc (...projects) {
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
      let worker = new Worker(WORKER, { workerData: [type, files] })
      worker.on('message', resolve)
      worker.on('error', reject)
    })
  })
}
