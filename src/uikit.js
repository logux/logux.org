function processHash () {
  let isDark = location.hash.includes('dark')
  document.documentElement.classList.toggle('is-dark', isDark)
}

window.addEventListener('hashchange', processHash)
processHash()
