let switchers = document.querySelectorAll('.switcher')

function keepScroll (el, cb) {
  let prevTop = el.getBoundingClientRect().top
  cb()
  let diff = el.getBoundingClientRect().top - prevTop
  window.scrollTo(window.scrollX, window.scrollY + diff)
}

let recursionBlocked = false
function preventRecursion (cb) {
  if (!recursionBlocked) {
    recursionBlocked = true
    cb()
    recursionBlocked = false
  }
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

function openTab (tab) {
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

function mapByAttr (els, attr) {
  return els.reduce((all, section) => {
    all[section.getAttribute(attr)] = section
    return all
  }, { })
}

function addToGroupByText (group, els) {
  for (let i of els) {
    let value = i.innerText
    if (!group[value]) group[value] = []
    group[value].push(i)
  }
}

let byText = { }

for (let switcher of switchers) {
  let tabs = switcher.children[0]
  let firstTab = tabs.children[0]
  let lastTab = tabs.children[tabs.children.length - 1]
  let currentTab = firstTab

  let sections = Array.from(switcher.children).slice(1)
  let currentSection = sections[0]

  addToGroupByText(byText, tabs.children)
  let byId = mapByAttr(sections, 'aria-labelledby')

  tabs.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return
    if (e.target === currentTab) return

    keepScroll(e.target, () => {
      currentTab = changeTab(currentTab, e.target)
      currentSection = changeSection(currentSection, byId[currentTab.id])
      preventRecursion(() => {
        for (let i of byText[currentTab.innerText]) {
          if (i !== currentTab) i.click()
        }
      })
    })
  })

  onKey(tabs, {
    ArrowDown () {
      focusOnce(currentSection)
    },
    ArrowRight () {
      openTab(currentTab.nextSibling || firstTab)
    },
    ArrowLeft () {
      openTab(currentTab.previousSibling || lastTab)
    },
    Home () {
      openTab(firstTab)
    },
    End () {
      openTab(lastTab)
    }
  })
}
