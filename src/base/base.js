let lastDown, lastDownAt

function activeParent (element) {
  if (
    element.tagName === 'A' ||
    element.tagName === 'BUTTON' ||
    (element.tagName === 'INPUT' && element.type === 'submit')
  ) {
    return element
  } else if (element.parentElement) {
    return activeParent(element.parentElement)
  } else {
    return null
  }
}

document.addEventListener('mousedown', e => {
  lastDown = activeParent(e.target)
  lastDownAt = Date.now()
})

document.addEventListener('focusin', e => {
  if (e.target === lastDown && Date.now() - lastDownAt < 999) {
    e.target.blur()
  }
})
