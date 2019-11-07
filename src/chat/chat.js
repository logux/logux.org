function initChat () {
  let button = document.querySelector('.chat a')
  if (button) {
    window.gitter = {
      chat: {
        options: {
          room: 'logux/logux',
          activationElement: '.chat a'
        }
      }
    }

    let script = document.createElement('script')
    script.src = 'https://sidecar.gitter.im/dist/sidecar.v1.js'
    script.async = true
    document.head.appendChild(script)
  }
}

window.addEventListener('load', () => {
  let saveData = navigator.connection && navigator.connection.saveData
  if (window.innerWidth > 940 && navigator.onLine && !saveData) {
    initChat()
  }
})
