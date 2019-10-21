let switchers = document.querySelectorAll('.switcher')

for (let switcher of switchers) {
  let tabs = switcher.children[0]
  let sections = Array.from(switcher.children).slice(1)
  let lastOpen = sections[0]
  let lastButton = tabs.children[0].children[0]

  let byId = sections.reduce((all, section) => {
    all[section.getAttribute('aria-labelledby')] = section
    return all
  }, { })

  tabs.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return
    let section = byId[e.target.id]
    lastButton.removeAttribute('aria-selected', false)
    e.target.setAttribute('aria-selected', 'true')
    lastOpen.setAttribute('hidden', true)
    section.removeAttribute('hidden', false)
    lastOpen = section
    lastButton = e.target
  })
}
