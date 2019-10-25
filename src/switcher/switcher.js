function keepScroll (el, cb) {
  let prevTop = el.getBoundingClientRect().top
  cb()
  let diff = el.getBoundingClientRect().top - prevTop
  window.scrollTo(window.scrollX, window.scrollY + diff)
}

function changeTab (from, to) {
  from.removeAttribute('aria-selected')
  to.setAttribute('aria-selected', 'true')
  from.setAttribute('tabindex', '-1')
  to.removeAttribute('tabindex')
  return to
}

function changeSection (from, to) {
  from.setAttribute('hidden', true)
  to.removeAttribute('hidden')
  return to
}

function focusOnce (el) {
  el.setAttribute('tabindex', '-1')
  function listener () {
    el.removeAttribute('tabindex')
    el.removeEventListener('blur', listener)
  }
  el.addEventListener('blur', listener)
  el.focus()
}

function clickOnTab (tab) {
  tab.focus()
  tab.click()
}

function onKey (el, keys) {
  el.addEventListener('keydown', e => {
    if (keys[e.code]) {
      e.preventDefault()
      keys[e.code]()
    }
  })
}

function addToGroupByValue (group, els) {
  for (let i of els) {
    let value = i.innerText
    if (!group[value]) group[value] = []
    group[value].push(i)
  }
}

let byValue = { }
let open = new Map()

let switchers = document.querySelectorAll('.switcher')
for (let switcher of switchers) {
  let tabs = switcher.children[0]
  let firstTab = tabs.children[0]
  let lastTab = tabs.children[tabs.children.length - 1]
  let currentTab = firstTab

  let sections = Array.from(switcher.children).slice(1)
  let currentSection = sections[0]

  addToGroupByValue(byValue, tabs.children)

  for (let tab of tabs.children) {
    let section = sections.find(i => {
      return i.getAttribute('aria-labelledby') === tab.id
    })
    open.set(tab, () => {
      currentTab = changeTab(currentTab, tab)
      currentSection = changeSection(currentSection, section)
    })
  }

  tabs.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return
    if (e.target === currentTab) return

    keepScroll(e.target, () => {
      open.get(e.target)()
      for (let i of byValue[currentTab.innerText]) open.get(i)()
    })
  })

  onKey(tabs, {
    ArrowDown () {
      focusOnce(currentSection)
    },
    ArrowRight () {
      clickOnTab(currentTab.nextSibling || firstTab)
    },
    ArrowLeft () {
      clickOnTab(currentTab.previousSibling || lastTab)
    },
    Home () {
      clickOnTab(firstTab)
    },
    End () {
      clickOnTab(lastTab)
    }
  })
}
