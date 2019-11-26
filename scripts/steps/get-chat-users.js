import { request } from 'https'
import chalk from 'chalk'

import wrap from '../lib/spinner.js'

function callGitter (token, command) {
  return new Promise((resolve, reject) => {
    let req = request({
      method: 'GET',
      hostname: 'api.gitter.im',
      path: `/v1/${ command }`,
      headers: {
        'Authorization': `Bearer ${ process.env.GITTER_TOKEN }`,
        'Content-Type': 'application/json'
      }
    }, res => {
      let data = ''
      res.on('data', chunk => {
        data += chunk
      })
      res.on('end', () => {
        let answer
        try {
          answer = JSON.parse(data)
        } catch (e) {
          console.error(data)
          reject(new Error('Bad answer from Gitter'))
        }
        if (answer.error) {
          reject(new Error(answer.error))
        } else {
          resolve(answer)
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function getChatUsers () {
  if (!process.env.GITTER_ROOM_ID) {
    process.stderr.write(chalk.yellow(
      'Using non-real chat users number because of the lack of Gitter token\n'
    ))
    return 42
  }
  let room = await callGitter(`rooms/${ process.env.GITTER_ROOM_ID }`)
  return room.userCount
}

export default wrap(getChatUsers, 'Updating chat users')
