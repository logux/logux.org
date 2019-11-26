export default function () {
  let saveData = navigator.connection && navigator.connection.saveData
  return window.innerWidth <= 940 || saveData
}
