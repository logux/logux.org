import { glob } from 'node:fs/promises'

function byDepthAndName(a, b) {
  let depth = a.split('/').length - b.split('/').length
  if (depth !== 0) return depth
  if (a === b) return 0
  return a < b ? -1 : 1
}

export default async function globFiles(pattern, options) {
  let files = await Array.fromAsync(glob(pattern, options))
  return files.toSorted(byDepthAndName)
}
