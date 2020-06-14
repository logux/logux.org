import capitalize from 'capitalize'
import { join } from 'path'
import TypeDoc from 'typedoc'
import globby from 'globby'

import { PROJECTS } from '../lib/dirs.js'
import { run } from '../lib/spinner.js'

export default async function readTypedoc (...projects) {
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
      includeDeclarations: true,
      excludeExternals: true,
      esModuleInterop: true
    })
    let { errors, project } = app.converter.convert(files.flat())
    if (errors.length > 0) {
      console.error(`Error during ${type} types generation`)
      throw new Error(errors[0].messageText)
    }
    if (!project.children) {
      throw new Error(JSON.stringify(project))
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
