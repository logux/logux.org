import crypto from 'crypto'

export default function hash (content) {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8)
}
