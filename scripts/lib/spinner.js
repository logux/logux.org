import { createSpinner } from 'nanospinner'
import { styleText } from 'node:util'

export let step
if (process.env.CI || process.env.GITHUB_ACTIONS) {
  step = text => {
    process.stdout.write(`- ${text}\n`)
    let start = Date.now()
    return e => {
      if (e) {
        process.stdout.write(styleText('red', '✖ ') + text + '\n')
      } else {
        let time = Date.now() - start + ' ms'
        process.stdout.write(
          styleText('green', '✓ ') + text + ' ' + styleText('gray', time) + '\n'
        )
      }
    }
  }
} else {
  // `nanospinner` shows a single spinner, but steps run in parallel.
  // Keep all running steps in one spinner and print finished ones above it.
  let spinner = createSpinner('', { stream: process.stdout })
  let running = new Map()
  let lastId = 0

  let redraw = () => {
    if (running.size === 0) {
      spinner.stop()
    } else {
      spinner.update({ text: Array.from(running.values()).join('\n  ') })
      if (!spinner.isSpinning()) spinner.start()
    }
  }

  step = text => {
    let id = ++lastId
    let start = Date.now()
    running.set(id, text)
    redraw()
    return e => {
      running.delete(id)
      if (spinner.isSpinning() && process.stdout.isTTY) spinner.clear()
      if (e) {
        process.stdout.write(styleText('red', '✖ ') + text + '\n')
      } else {
        let time = Date.now() - start + ' ms'
        process.stdout.write(
          styleText('green', '✓ ') + text + ' ' + styleText('gray', time) + '\n'
        )
      }
      redraw()
    }
  }
}

export async function run(text, fn) {
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

export default function wrap(fn, text) {
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
