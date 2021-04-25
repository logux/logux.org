import capitalize from 'capitalize'
import { join } from 'path'
import TypeDoc from 'typedoc'
import globby from 'globby'

import { PROJECTS } from '../lib/dirs.js'
import { run } from '../lib/spinner.js'

export default async function readTypedoc(...projects) {
  let type = capitalize(projects[0].replace(/^logux-/, ''))

  let files = await run(`Reading ${type} TypeDoc`, async () => {
    return Promise.all(
      projects.map(i => {
        return globby('**/*.d.ts', {
          absolute: true,
          ignore: ['node_modules', 'test', 'coverage'],
          cwd: join(PROJECTS, i)
        })
      })
    )
  })

  let ignore
  if (type === 'Server') {
    ignore = ['Reconnect', 'ClientNode', 'WsConnection']
  } else {
    ignore = ['ServerNode', 'ServerConnection']
  }

  let docs = await run(`Generating ${type} TypeDoc`, async () => {
    let app = new TypeDoc.Application()
    app.bootstrap({
      entryPoints: files.flat(),
      tsconfig: join(PROJECTS, 'logux-core', 'tsconfig.json'),
      excludeExternals: true
    })
    app.options.setCompilerOptions(files.flat(), {
      esModuleInterop: true,
      skipLibCheck: true
    })
    let project = app.convert()
    if (!project || app.logger.hasErrors()) {
      throw new Error(`Error during ${type} types generation`)
    }
    if (!project.children) {
      throw new Error(`${type} types are empty`)
    }
    let nodes = []
    for (let file of project.children) {
      nodes.push(
        ...file.children.filter(i => {
          return !ignore.includes(i.name) && i.kindString !== 'Reference'
        })
      )
    }
    return nodes
  })

  return docs
}
