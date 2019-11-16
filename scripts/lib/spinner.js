let Spinnies = require('spinnies')
let { gray } = require('chalk')

let spinner = new Spinnies({ succeedColor: 'white' })
let lastId = 0

function step (text) {
  lastId++
  let id = lastId.toString()
  let start = Date.now()
  spinner.add(id, { text })
  return () => {
    let time = Date.now() - start
    spinner.succeed(id, { text: text + gray(` ${ time } ms`) })
  }
}

function wrap (fn, text) {
  return async (...args) => {
    let end = step(text)
    let result = await fn(...args)
    end()
    return result
  }
}

async function run (text, fn) {
  let end = step(text)
  let result = await fn()
  end()
  return result
}

module.exports = wrap
module.exports.run = run
module.exports.step = step
