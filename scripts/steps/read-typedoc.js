import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Application, ReflectionKind } from 'typedoc'

import { PROJECTS } from '../lib/dirs.js'
import glob from '../lib/glob.js'
import { run } from '../lib/spinner.js'

function capitalize(str) {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase()
}

export default async function readTypedoc(...projects) {
  let type = capitalize(projects[0].replace(/^logux-/, ''))

  let files = await run(`Reading ${type} TypeDoc`, async () => {
    return Promise.all(
      projects.map(async i => {
        let cwd = join(PROJECTS, i)
        let found = await glob('**/*.d.ts', {
          cwd,
          exclude: ['node_modules', 'test', 'coverage']
        })
        return found.map(file => join(cwd, file))
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
    // TypeDoc 0.28 builds the program from `tsconfig` instead of the file
    // list that `setCompilerOptions()` used to take, so limit it to the
    // type definitions. Otherwise it type-checks the projects’ tests too.
    let tsconfig = join(PROJECTS, `tsconfig.${type.toLowerCase()}.json`)
    await writeFile(
      tsconfig,
      JSON.stringify({
        extends: './logux-core/tsconfig.json',
        files: files.flat(),
        include: []
      })
    )
    let app = await Application.bootstrap({
      entryPoints: files.flat(),
      excludeExternals: true,
      tsconfig
    })
    let project = await app.convert()
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
          return (
            !ignore.includes(i.name) && i.kind !== ReflectionKind.Reference
          )
        })
      )
    }
    return nodes
  })

  return docs
}
