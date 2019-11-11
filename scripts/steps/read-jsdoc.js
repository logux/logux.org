let { build } = require('documentation')
let { join } = require('path')
let globby = require('globby')

const PROJECTS = join(__dirname, '..', '..', '..')

module.exports = async function readJsdoc (...projects) {
  let files = await globby(`{${ projects.join(',') }}/**/*.js`, {
    ignore: projects.flatMap(i => {
      return [join(i, 'node_modules'), join(i, 'test'), join(i, 'coverage')]
    }),
    cwd: PROJECTS
  })
  return build(files.map(i => join(PROJECTS, i)), {
    hljs: { languages: ['js'] }
  })
}
