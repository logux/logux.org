import { styleText } from 'node:util'

let errors = []

export function addError(text) {
  errors.push(text)
}

export function exitOnErrors() {
  if (errors.length > 0) {
    process.stderr.write(
      styleText('red', errors.join('\n'), { stream: process.stderr }) + '\n'
    )
    process.exit(1)
  }
}
