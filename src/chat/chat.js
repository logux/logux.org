let buttons = document.querySelectorAll('.chat')

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
    for (let button of buttons) {
      button.addEventListener('click', e => {
        if (isSimpleClick(e)) {
          e.preventDefault()
          detail.chat.toggleChat(show)
          show = !show
        }
      })
    }
  })
}

if (buttons.length > 0) {
  window.addEventListener('load', () => {
    let saveData = navigator.connection && navigator.connection.saveData
    if (navigator.onLine && !saveData) initChat()
  })
}
