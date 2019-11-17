let { parentPort, workerData } = require('worker_threads')
let { build } = require('documentation')

function trim (tree, classes) {
  return tree.filter(i => {
    return i.kind !== 'class' || !classes.includes(i.name)
  })
}

async function read (type, files) {
  let tree = await build(files.flat(), { })
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
    tree = trim(tree, [
      'Reconnect', 'LoguxError', 'ClientNode',
      'WsConnection', 'BaseServer', 'BaseNode'
    ])
  } else if (type === 'server') {
    tree = trim(tree, ['ServerNode', 'BaseNode'])
  }
  return tree
}

read(...workerData).then(tree => {
  parentPort.postMessage(tree)
})
