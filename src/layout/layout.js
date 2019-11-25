function isSimpleClick (e) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

let aside = document.querySelector('.layout_aside')
let links = document.querySelectorAll('.layout_aside a[href^="#"]')
let close = document.querySelector('.layout_close')
let open = document.querySelector('.layout_open')
let chat = document.querySelector('.layout_chat')

let closed = true
if (open && close && aside) {
  open.addEventListener('click', () => {
    closed = false
    document.body.classList.add('has-no-scroll')
    aside.classList.add('is-open')
    open.setAttribute('hidden', true)
    chat.setAttribute('hidden', true)
    close.removeAttribute('hidden')
  })
  close.addEventListener('click', () => {
    closed = true
    document.body.classList.remove('has-no-scroll')
    aside.classList.remove('is-open')
    open.removeAttribute('hidden')
    chat.removeAttribute('hidden')
    close.setAttribute('hidden', true)
  })
}

for (let link of links) {
  link.addEventListener('click', e => {
    if (!closed && isSimpleClick(e)) close.click()
  })
}
