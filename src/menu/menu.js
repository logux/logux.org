import { isSaveDate } from '../../lib/is-save-data.js'

if (document.fonts && !isSaveDate()) {
  window.addEventListener('load', () => {
    void document.fonts.load('1px Kurbanistika')
  })
}
