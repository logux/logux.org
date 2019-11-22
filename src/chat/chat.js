let button = document.querySelector('.chat')

function isSimpleClick (e) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

function initChat () {
  window.gitter = {
    chat: {
      options: {
        room: 'logux/logux',
        activationElement: false
      }
    }
  }
  let script = document.createElement('script')
  script.src = 'https://sidecar.gitter.im/dist/sidecar.v1.js'
  script.async = true
  document.head.appendChild(script)

  document.addEventListener('gitter-sidecar-instance-started', ({ detail }) => {
    let show = true
    button.addEventListener('click', e => {
      console.log(1)
      if (isSimpleClick(e)) {
        e.preventDefault()
        detail.chat.toggleChat(show)
        show = !show
      }
    })
  })
}

if (button) {
  window.addEventListener('load', () => {
    let saveData = navigator.connection && navigator.connection.saveData
    if (window.innerWidth > 940 && navigator.onLine && !saveData) {
      initChat()
    }
  })
}
