import { join } from 'path'
import TypeDoc from 'typedoc'
import globby from 'globby'

import { PROJECTS, NODE_MODULES } from '../lib/dirs.js'
import { run } from '../lib/spinner.js'

export default async function readTypedoc (...projects) {
  let type = projects[0].replace(/^logux-/, '')

  let files = await run(`Looking for ${ type } JSDoc`, async () => {
    return Promise.all(projects.map(i => {
      return globby('**/*.d.ts', {
        absolute: true,
        ignore: ['node_modules', 'test', 'coverage'],
        cwd: join(PROJECTS, i)
      })
    }))
  })

  files.push(
    join(NODE_MODULES, 'nanoevents', 'package.json'),
    join(NODE_MODULES, 'nanoevents', 'index.d.ts')
  )

  let ignore
  if (type === 'server') {
    ignore = ['Reconnect', 'ClientNode', 'WsConnection', 'BaseServer']
  } else if (type === 'client') {
    ignore = ['ServerNode', 'ServerConnection']
  }

  let docs = await run(`Generating ${ type } JSDoc`, async () => {
    let app = new TypeDoc.Application()
    app.bootstrap({
      includeDeclarations: true,
      excludeExternals: true,
      esModuleInterop: true
    })
    let { errors, project } = app.converter.convert(files.flat())
    if (errors.length > 0) {
      throw new Error(errors[0].messageText)
    }
    let nodes = []
    for (let file of project.children) {
      nodes.push(...file.children.filter(i => {
        return !ignore.includes(i.name) && i.kindString !== 'Reference'
      }))
    }
    return nodes
  })

  return docs
}
