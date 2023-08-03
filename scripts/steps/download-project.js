import child from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

import { PROJECTS } from '../lib/dirs.js'
import { run } from '../lib/spinner.js'

let exec = promisify(child.exec)

export default async function downloadProject(name) {
  let dir = join(PROJECTS, name)
  if (existsSync(dir)) return

  let repo = 'logux/' + name.replace(/^logux-/, '')
  let url = `https://github.com/${repo}.git`

  await run(`Downloading ${repo}`, async () => {
    await exec(`git clone --depth 1 ${url} "${dir}"`)
  })
}
