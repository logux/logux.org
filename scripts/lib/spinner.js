import Spinnies from 'spinnies'
import kleur from 'kleur'

let spinner = new Spinnies({ succeedColor: 'white' })
let lastId = 0

export let step
if (process.env.CI || process.env.GITHUB_ACTIONS) {
  step = text => {
    process.stdout.write(`- ${text}\n`)
    let start = Date.now()
    return e => {
      if (e) {
        process.stdout.write(kleur.red('✖ ') + text + '\n')
      } else {
        let time = Date.now() - start + ' ms'
        process.stdout.write(
          kleur.green('✓ ') + text + ' ' + kleur.gray(time) + '\n'
        )
      }
    }
  }
} else {
  step = text => {
    lastId++
    let id = lastId.toString()
    let start = Date.now()
    spinner.add(id, { text })
    return e => {
      if (e) {
        spinner.fail(id)
      } else {
        let time = Date.now() - start
        spinner.succeed(id, { text: text + kleur.gray(` ${time} ms`) })
      }
    }
  }
}

export async function run (text, fn) {
  let end = step(text)
  try {
    let result = await fn()
    end()
    return result
  } catch (e) {
    end(e)
    throw e
  }
}

export default function wrap (fn, text) {
  return async (...args) => {
    let end = step(text)
    try {
      let result = await fn(...args)
      end()
      return result
    } catch (e) {
      end(e)
      throw e
    }
  }
}
