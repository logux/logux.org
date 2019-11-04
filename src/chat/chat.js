function initChat () {
  let chat = document.querySelector('.chat')
  if (chat) {
    document.addEventListener('gitter-sidecar-ready', () => {
      chat.classList.add('is-ready')
    })

    window.gitter = {
      chat: {
        options: {
          room: 'logux/logux',
          activationElement: '.chat button'
        }
      }
    }

    let script = document.createElement('script')
    script.src = 'https://sidecar.gitter.im/dist/sidecar.v1.js'
    script.async = true
    script.crossOrigin = ''
    document.head.appendChild(script)
  }
}

window.addEventListener('load', () => {
  let saveData = navigator.connection && navigator.connection.saveData
  if (window.innerWidth > 940 && navigator.onLine && !saveData) {
    initChat()
  }
})
