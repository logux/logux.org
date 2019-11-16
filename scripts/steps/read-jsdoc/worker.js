let { parentPort, workerData } = require('worker_threads')
let { build } = require('documentation')

function trim (tree, classes) {
  return tree.filter(i => {
    return i.kind !== 'class' || !classes.includes(i.name)
  })
}

async function read (type, files) {
  let tree = await build(files.flat(), { })
  for (let i of tree) {
    if (i.kind === 'class' && i.augments.length > 0) {
      let parentName = i.augments[0].name
      let parent = tree.find(j => j.name === parentName)
      if (parent) {
        i.members.static.push(...parent.members.static)
        i.members.instance.push(...parent.members.instance)
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
