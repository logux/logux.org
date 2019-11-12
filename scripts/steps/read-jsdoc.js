let { build } = require('documentation')
let { join } = require('path')
let globby = require('globby')

const PROJECTS = join(__dirname, '..', '..', '..')

module.exports = async function readJsdoc (...projects) {
  process.stdout.write('Generating JSDoc\n')
  let files = await Promise.all(projects.map(i => {
    return globby('**/*.js', {
      absolute: true,
      ignore: ['node_modules', 'test', 'coverage'],
      cwd: join(PROJECTS, i)
    })
  }))
  let tree = await build(files.flat(), { hljs: { languages: ['js'] } })
  return tree
}
