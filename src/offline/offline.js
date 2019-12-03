import isSaveDate from '../../lib/is-save-data.js'

function init () {
  navigator.serviceWorker.register('/service.js')
}

if (process.env.NODE_ENV === 'production') {
  if (!isSaveDate() && navigator.serviceWorker) {
    init()
  } else if (localStorage.appinstalled) {
    init()
  } else {
    window.addEventListener('appinstalled', () => {
      localStorage.appinstalled = true
      init()
    })
  }
}
