let { build } = require('documentation')
let { join } = require('path')
let globby = require('globby')

const PROJECTS = join(__dirname, '..', '..', '..')

module.exports = async function readJsdoc (spin, ...projects) {
  spin.add(`jsdoc${ projects.join() }`, { text: 'Generating JSDoc' })
  let files = await Promise.all(projects.map(i => {
    return globby('**/*.js', {
      absolute: true,
      ignore: ['node_modules', 'test', 'coverage'],
      cwd: join(PROJECTS, i)
    })
  }))
  let tree = await build(files.flat(), { hljs: { languages: ['js'] } })
  spin.succeed(`jsdoc${ projects.join() }`, { text: 'JSDoc generated' })
  return tree
}
