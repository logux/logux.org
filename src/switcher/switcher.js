function keepScroll (el, cb) {
  let prevTop = el.getBoundingClientRect().top
  cb()
  let newTop = el.getBoundingClientRect().top
  window.scrollTo(window.scrollX, window.scrollY + newTop - prevTop)
}

function changeTab (from, to) {
  from.removeAttribute('aria-selected')
  from.parentNode.classList.remove('is-open')
  to.setAttribute('aria-selected', 'true')
  to.parentNode.classList.add('is-open')
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

function addTo (group, key, el) {
  if (!group[key]) group[key] = []
  group[key].push(el)
}

function findByAttr (array, attr, value) {
  return array.find(i => i.getAttribute(attr) === value)
}

function readOpenned () {
  try {
    let json = localStorage.switcherOpenned
    return json ? JSON.parse(json) : []
  } catch {
    return []
  }
}

function writeOpenned (add, remove) {
  setTimeout(() => {
    let openned = new Set(readOpenned())
    openned.add(add)
    for (let i of remove) openned.delete(i)
    try {
      localStorage.switcherOpenned = JSON.stringify(Array.from(openned))
    } catch {}
  }, 0)
}

let byValue = {}
let open = new Map()
let switchers = document.querySelectorAll('.switcher')

for (let switcher of switchers) {
  let tabs = switcher.children[0]
  let firstTab = tabs.children[0].children[0]
  let lastTab = tabs.children[tabs.children.length - 1].children[0]
  let currentTab = firstTab

  let sections = Array.from(switcher.children).slice(1)
  let currentSection = sections[0]
  let values = []

  for (let li of tabs.children) {
    let tab = li.children[0]
    let name = tab.dataset.name || tab.innerText
    let section = findByAttr(sections, 'aria-labelledby', tab.id)
    values.push(name)
    addTo(byValue, name, tab)
    open.set(tab, () => {
      currentTab = changeTab(currentTab, tab)
      currentSection = changeSection(currentSection, section)
    })
  }

  tabs.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON' && e.target !== currentTab) {
      let value = e.target.dataset.name || e.target.innerText
      keepScroll(e.target, () => {
        open.get(e.target)()
        for (let similar of byValue[value]) {
          if (similar !== e.target) {
            open.get(similar)()
          }
        }
      })
      writeOpenned(
        value,
        values.filter(i => i !== value)
      )
    }
  })

  onKey(tabs, {
    ArrowDown () {
      focusOnce(currentSection)
    },
    ArrowRight () {
      if (currentTab === lastTab) {
        clickOnTab(firstTab)
      } else {
        clickOnTab(currentTab.parentNode.nextSibling.children[0])
      }
    },
    ArrowLeft () {
      if (currentTab === firstTab) {
        clickOnTab(lastTab)
      } else {
        clickOnTab(currentTab.parentNode.previousSibling.children[0])
      }
    },
    Home () {
      clickOnTab(firstTab)
    },
    End () {
      clickOnTab(lastTab)
    }
  })
}

for (let value of readOpenned()) {
  let tabs = byValue[value] || []
  for (let tab of tabs) open.get(tab)()
}
