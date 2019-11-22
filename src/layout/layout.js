let open = document.querySelector('.layout_open')
let close = document.querySelector('.layout_close')
let chat = document.querySelector('.layout_chat')
let aside = document.querySelector('.layout_aside')

if (open && close && aside) {
  open.addEventListener('click', () => {
    document.body.classList.add('has-no-scroll')
    aside.classList.add('is-open')
    open.setAttribute('hidden', true)
    chat.setAttribute('hidden', true)
    close.removeAttribute('hidden')
  })
  close.addEventListener('click', () => {
    document.body.classList.remove('has-no-scroll')
    aside.classList.remove('is-open')
    open.removeAttribute('hidden')
    chat.removeAttribute('hidden')
    close.setAttribute('hidden', true)
  })
}
