const CACHE_VERSION = '1'
const FILES = ['/favicon.ico']

async function fromCache (request) {
  let cache = await caches.open(CACHE_VERSION)
  let match = await cache.match(request)
  return match
}

async function precache () {
  let cache = await caches.open(CACHE_VERSION)
  cache.addAll(FILES)
}

self.addEventListener('install', e => {
  e.waitUntil(precache())
})

self.addEventListener('fetch', e => {
  e.respondWith(fromCache(e.request))
})
