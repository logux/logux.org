let { build } = require('documentation')
let { join } = require('path')
let globby = require('globby')

let { run } = require('../lib/spinner')

const PROJECTS = join(__dirname, '..', '..', '..')

function trim (tree, classes) {
  return tree.filter(i => {
    return i.kind !== 'class' || !classes.includes(i.name)
  })
}

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
    let tree = await build(files.flat(), { })
    for (let i of tree) {
      if (i.kind === 'class' && i.augments.length > 0) {
        let parentName = i.augments[0].name
        let parent = tree.find(j => j.name === parentName)
        if (parent) {
          i.members.static.push(...parent.members.static)
          i.members.instance.push(...parent.members.instance)
        }
      }
    }
    if (type === 'server') {
      tree = trim(tree, [
        'Reconnect', 'LoguxError', 'ClientNode',
        'WsConnection', 'BaseServer', 'BaseNode'
      ])
    } else if (type === 'server') {
      tree = trim(tree, ['ServerNode', 'BaseNode'])
    }
    return tree
  })
}
