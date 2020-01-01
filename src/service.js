const CACHE_VERSION = '1'

async function fromCache (request) {
  let cache = await caches.open(CACHE_VERSION)
  let match = await cache.match(request, { ignoreSearch: true })
  if (match) {
    return match
  } else {
    return fetch(request)
  }
}

async function cleanCache (cache, files) {
  let keys = await cache.keys()
  await Promise.all(keys.map(async key => {
    let { pathname } = new URL(key.url)
    if (!files.includes(pathname)) {
      await cache.delete(key)
    }
  }))
}

async function precache () {
  let cache = await caches.open(CACHE_VERSION)
  let files = FILES
  await Promise.all([
    cleanCache(cache, files),
    cache.addAll(files)
  ])
}

self.addEventListener('install', e => {
  e.waitUntil(precache())
})

self.addEventListener('fetch', e => {
  let { hostname } = new URL(e.request.url)
  if (self.location.hostname === hostname) {
    e.respondWith(fromCache(e.request))
  }
})
