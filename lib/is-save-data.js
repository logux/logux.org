export function isSaveDate() {
  let saveData = navigator.connection && navigator.connection.saveData
  return window.innerWidth <= 940 || saveData
}
