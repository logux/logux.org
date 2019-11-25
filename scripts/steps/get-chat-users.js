import { request } from 'https'

import loadSecrets from '../lib/load-secrets.js'
import wrap from '../lib/spinner.js'

function callGitter (token, command) {
  return new Promise((resolve, reject) => {
    let req = request({
      method: 'GET',
      hostname: 'api.gitter.im',
      path: `/v1/${ command }`,
      headers: {
        'Authorization': `Bearer ${ token }`,
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
  if (process.env.TRAVIS_CI) return 12
  if (process.env.GITTER_USERS) return parseInt(process.env.GITTER_USERS)
  let { gitter } = await loadSecrets()
  let room = await callGitter(gitter.token, `rooms/${ gitter.roomId }`)
  return room.userCount
}

export default wrap(getChatUsers, 'Updating chat users')
