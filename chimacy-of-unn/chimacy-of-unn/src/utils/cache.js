// Minimal in-memory cache for data that changes rarely (programmes, rules)
// but is read on almost every page navigation. Cuts a real network round
// trip every time an admin moves between pages, which is one of the biggest
// perceived-speed wins available for a Supabase-backed SPA. Cleared
// explicitly whenever the underlying data is written.
const store = new Map()

export async function cached(key, fetcher) {
  if (store.has(key)) return store.get(key)
  const promise = fetcher().catch((err) => {
    store.delete(key) // don't cache failures
    throw err
  })
  store.set(key, promise)
  return promise
}

export function invalidate(key) {
  store.delete(key)
}

export function invalidateAll() {
  store.clear()
}
