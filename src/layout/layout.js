import isSimpleClick from '../../lib/is-simple-click.js'

let aside = document.querySelector('.layout_aside')
let links = document.querySelectorAll('.layout_aside a[href^="#"]')
let close = document.querySelector('.layout_close')
let open = document.querySelector('.layout_open')
let chat = document.querySelector('.layout_float a')

let prevScroll
let closed = true
if (open && close && aside) {
  open.addEventListener('click', () => {
    closed = false

    prevScroll = window.scrollY
    document.body.style.top = `-${prevScroll}px`
    document.body.classList.add('is-locked')

    aside.classList.add('is-open')
    open.setAttribute('hidden', true)
    chat.setAttribute('hidden', true)
    close.removeAttribute('hidden')
  })

  close.addEventListener('click', () => {
    closed = true

    document.body.style.top = ''
    document.body.classList.remove('is-locked')
    window.scrollTo(0, prevScroll)

    aside.classList.remove('is-open')
    open.removeAttribute('hidden')
    chat.removeAttribute('hidden')
    close.setAttribute('hidden', true)
  })
}

window.matchMedia('(min-width: 1023px)').addListener(close.click)

for (let link of links) {
  link.addEventListener('click', e => {
    if (!closed && isSimpleClick(e)) close.click()
  })
}
