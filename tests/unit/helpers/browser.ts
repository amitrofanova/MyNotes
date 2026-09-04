export function createMemoryStorage(): Storage {
  const data = new Map<string, string>()

  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    key(index: number) {
      return [...data.keys()][index] ?? null
    },
    removeItem(key: string) {
      data.delete(key)
    },
    setItem(key: string, value: string) {
      data.set(key, String(value))
    },
  }
}

export function installBrowserStubs(): {
  localStorage: Storage
  window: EventTarget
  document: EventTarget & { visibilityState: DocumentVisibilityState }
} {
  const localStorage = createMemoryStorage()
  const windowTarget = new EventTarget()
  const documentTarget = Object.assign(new EventTarget(), {
    visibilityState: 'visible' as DocumentVisibilityState,
  })

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorage,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'window', {
    value: windowTarget,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'document', {
    value: documentTarget,
    configurable: true,
    writable: true,
  })

  return {
    localStorage,
    window: windowTarget,
    document: documentTarget,
  }
}
