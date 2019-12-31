import Spinnies from 'spinnies'
import chalk from 'chalk'

let spinner = new Spinnies({ succeedColor: 'white' })
let lastId = 0

export let step
if (process.env.CI) {
  step = text => {
    process.stdout.write(`- ${ text }\n`)
    let start = Date.now()
    return () => {
      let time = (Date.now() - start + ' ms')
      process.stdout.write(
        chalk.green('✓ ') + text + ' ' + chalk.gray(time) + '\n'
      )
    }
  }
} else {
  step = text => {
    lastId++
    let id = lastId.toString()
    let start = Date.now()
    spinner.add(id, { text })
    return () => {
      let time = Date.now() - start
      spinner.succeed(id, { text: text + chalk.gray(` ${ time } ms`) })
    }
  }
}

export async function run (text, fn) {
  let end = step(text)
  let result = await fn()
  end()
  return result
}

export default function wrap (fn, text) {
  return async (...args) => {
    let end = step(text)
    let result = await fn(...args)
    end()
    return result
  }
}
