import { parentPort, workerData } from 'worker_threads'
import documentation from 'documentation'

function trim (tree, classes) {
  return tree.filter(i => {
    return i.kind !== 'class' || !classes.includes(i.name)
  })
}

async function read (type, files) {
  let tree = await documentation.build(files.flat(), { })
  for (let node of tree) {
    if (node.kind === 'class' && node.augments.length > 0) {
      let parentName = node.augments[0].name
      let parent = tree.find(i => i.name === parentName)
      if (parent) {
        for (let area of ['static', 'instance']) {
          for (let i of parent.members[area]) {
            if (node.members[area].every(j => j.name !== i.name)) {
              node.members[area].push(i)
            }
          }
        }
      }
    }
  }
  if (type === 'server') {
    tree = trim(tree, ['Reconnect', 'ClientNode', 'WsConnection', 'BaseServer'])
  } else if (type === 'client') {
    tree = trim(tree, ['ServerNode'])
  }
  return tree
}

read(...workerData).then(tree => {
  parentPort.postMessage(tree)
})
