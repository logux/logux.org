let htmlClasses = document.documentElement.classList

function processHash () {
  console.log(location.hash, location.hash === '#light')
  htmlClasses.toggle('is-light', location.hash === '#light')
  htmlClasses.toggle('is-dark', location.hash === '#dark')
}

window.addEventListener('hashchange', processHash)
processHash()
