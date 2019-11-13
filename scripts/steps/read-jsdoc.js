let { build } = require('documentation')
let { join } = require('path')
let globby = require('globby')

const PROJECTS = join(__dirname, '..', '..', '..')

function trim (tree, classes) {
  return tree.filter(i => {
    return i.kind !== 'class' || !classes.includes(i.name)
  })
}

module.exports = async function readJsdoc (spin, ...projects) {
  spin.add(`jsdoc${ projects.join() }`, { text: 'Generating JSDoc' })
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
  if (projects.includes('logux-server')) {
    tree = trim(tree, ['Reconnect', 'LoguxError', 'ClientNode', 'WsConnection'])
  }
  spin.succeed(`jsdoc${ projects.join() }`, { text: 'JSDoc generated' })
  return tree
}
