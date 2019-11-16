let { build } = require('documentation')
let { join } = require('path')
let globby = require('globby')

let { step } = require('../lib/spinner')

const PROJECTS = join(__dirname, '..', '..', '..')

function trim (tree, classes) {
  return tree.filter(i => {
    return i.kind !== 'class' || !classes.includes(i.name)
  })
}

module.exports = async function readJsdoc (...projects) {
  let type = projects[0]
  let end = step(`Generating ${ type } JSDoc`)

  let files = await Promise.all(projects.map(i => {
    let ignore = []
    if (i === 'logux-core' && projects.includes('logux-server')) {
      ignore = [
        'reconnect.js', 'logux-error.js', 'client-node.js', 'ws-connection.js'
      ]
    }
    return globby('**/*.js', {
      absolute: true,
      ignore: ['node_modules', 'test', 'coverage', ...ignore],
      cwd: join(PROJECTS, i)
    })
  }))

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
  if (type === 'logux-server') {
    tree = trim(tree, [
      'Reconnect', 'LoguxError', 'ClientNode',
      'WsConnection', 'BaseServer', 'BaseNode'
    ])
  } else if (type === 'logux-server') {
    tree = trim(tree, ['ServerNode', 'BaseNode'])
  }

  end()
  return tree
}
