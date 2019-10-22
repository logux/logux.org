let switchers = document.querySelectorAll('.switcher')

for (let switcher of switchers) {
  let tabs = switcher.children[0]
  let sections = Array.from(switcher.children).slice(1)
  let lastSection = sections[0]
  let lastTab = tabs.children[0].children[0]

  let byId = sections.reduce((all, section) => {
    all[section.getAttribute('aria-labelledby')] = section
    return all
  }, { })

  tabs.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return
    if (e.target === lastTab) return
    let section = byId[e.target.id]
    lastTab.removeAttribute('aria-selected', false)
    e.target.setAttribute('aria-selected', 'true')
    lastTab.setAttribute('tabindex', '-1')
    e.target.removeAttribute('tabindex')
    lastSection.setAttribute('hidden', true)
    section.removeAttribute('hidden', false)
    lastSection = section
    lastTab = e.target
  })

  tabs.addEventListener('keydown', e => {
    let next
    if (e.code === 'ArrowRight') {
      next = lastTab.parentNode.nextSibling
      if (!next) next = tabs.children[0]
    } else if (e.code === 'ArrowLeft') {
      next = lastTab.parentNode.previousSibling
      if (!next) next = tabs.children[tabs.children.length - 1]
    } else if (e.code === 'ArrowDown') {
      e.preventDefault()
      lastSection.setAttribute('tabindex', '-1')
      lastSection.focus()
    }
    if (next) {
      e.preventDefault()
      let nextTab = next.children[0]
      nextTab.focus()
      nextTab.click()
    }
  })

  for (let section of sections) {
    section.addEventListener('blur', e => {
      e.target.removeAttribute('tabindex')
    })
  }
}
