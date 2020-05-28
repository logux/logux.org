import { promisify } from 'util'
import { join } from 'path'
import child from 'child_process'

import { PROJECTS } from '../lib/dirs.js'
import { run } from '../lib/spinner.js'

let exec = promisify(child.exec)

export default async function readSphinx () {
  let django = join(PROJECTS, 'logux-django')
  await run('Reading Django documentation', async () => {
    await exec('make venv && cd docs/ && make json', {
      cwd: django
    })
  })
}
