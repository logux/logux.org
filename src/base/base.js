let lastDown, lastDownAt

document.addEventListener('mousedown', e => {
  lastDown = e.target
  lastDownAt = Date.now()
})

document.addEventListener('focusin', e => {
  if (e.target === lastDown && Date.now() - lastDownAt < 999) {
    e.target.blur()
  }
})
