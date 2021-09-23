import { red } from 'nanocolors'

let errors = []

export function addError(text) {
  errors.push(text)
}

export function exitOnErrors() {
  if (errors.length > 0) {
    process.stderr.write(red(errors.join('\n')) + '\n')
    process.exit(1)
  }
}
