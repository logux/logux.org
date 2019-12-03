import isSaveDate from '../../lib/is-save-data.js'

if (process.env.NODE_ENV === 'production') {
  if (!isSaveDate() && navigator.serviceWorker) {
    navigator.serviceWorker.register('/service.js')
  }
}
