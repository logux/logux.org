import child from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { PROJECTS } from '../lib/dirs.js'
import { run } from '../lib/spinner.js'

let exec = promisify(child.exec)

let NAMES = ['logux-core', 'logux-server', 'logux-client']

export default async function installTypes(nextSteps) {
  let dirs = NAMES.map(i => join(PROJECTS, i))
  if (dirs.every(i => existsSync(i))) {
    await Promise.all(nextSteps())
  } else {
    await Promise.all(nextSteps())
    await run('Installing types dependecies', async () => {
      for (let dir of dirs) {
        await exec('pnpm install --frozen-lockfile --ignore-scripts', {
          cwd: dir
        })
      }
    })
  }
}
