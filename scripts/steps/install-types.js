import { existsSync } from 'fs'
import { promisify } from 'util'
import { join } from 'path'
import child from 'child_process'

import { PROJECTS } from '../lib/dirs.js'
import { run } from '../lib/spinner.js'

let exec = promisify(child.exec)

let NAMES = [
  'logux-core',
  'logux-server',
  'logux-client',
  'logux-redux',
  'logux-vuex'
]

export default async function installTypes (nextSteps) {
  let dirs = NAMES.map(i => join(PROJECTS, i))
  if (dirs.every(i => existsSync(i))) {
    await Promise.all(nextSteps())
  } else {
    await Promise.all(nextSteps())
    await run('Installing types dependecies', async () => {
      for (let i of dirs) {
        await exec('yarn install --production', { cwd: i })
        if (i.endsWith('logux-core')) {
          await exec('yarn add ws', { cwd: i })
        } else if (i.endsWith('logux-redux')) {
          await exec('yarn add redux', { cwd: i })
        } else if (i.endsWith('logux-vuex')) {
          await exec('yarn add vuex', { cwd: i })
        }
      }
    })
  }
}
