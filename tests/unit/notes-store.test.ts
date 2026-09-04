import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore, NOTES_PERSIST_DEBOUNCE_MS } from '../../app/stores/notes'
import { SCHEMA_VERSION, STORAGE_KEY } from '../../app/utils/storage'
import type { PersistedState } from '../../app/utils/types'
import { installBrowserStubs } from './helpers/browser'

function readPersisted(): PersistedState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    return null
  }
  return JSON.parse(raw) as PersistedState
}

describe('notes store', () => {
  let browser: ReturnType<typeof installBrowserStubs>

  beforeEach(() => {
    browser = installBrowserStubs()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    localStorage.clear()
  })

  it('starts empty when storage is empty', () => {
    const store = useNotesStore()
    expect(store.list).toEqual([])
    expect(readPersisted()).toBeNull()
  })

  it('hydrates from storage without writing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      notes: [{ id: 'n1', title: 'Saved', todos: [] }],
    }))
    const setItem = vi.spyOn(localStorage, 'setItem')

    setActivePinia(createPinia())
    const store = useNotesStore()

    expect(store.list).toEqual([{ id: 'n1', title: 'Saved', todos: [] }])
    expect(store.getById('n1')?.title).toBe('Saved')
    expect(setItem).not.toHaveBeenCalled()
  })

  it('creates, reads, updates, and removes notes', () => {
    const store = useNotesStore()

    const created = store.create({
      title: 'Ideas',
      todos: [{ id: 't1', text: 'Sketch', done: false }],
    })

    expect(created.id).toEqual(expect.any(String))
    expect(store.list).toHaveLength(1)
    expect(store.getById(created.id)).toEqual(created)

    const updated = store.update(created.id, {
      title: 'Ideas v2',
      todos: [{ id: 't1', text: 'Sketch', done: true }],
    })

    expect(updated?.title).toBe('Ideas v2')
    expect(store.getById(created.id)?.todos[0]?.done).toBe(true)

    store.remove(created.id)
    expect(store.list).toEqual([])
    expect(store.getById(created.id)).toBeUndefined()
  })

  it('ignores delete of an unknown id', () => {
    const store = useNotesStore()
    store.create({ title: 'Keep me' })
    const setItem = vi.spyOn(localStorage, 'setItem')

    expect(() => store.remove('missing-id')).not.toThrow()
    expect(store.list).toHaveLength(1)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('returns undefined when updating an unknown id', () => {
    const store = useNotesStore()
    expect(store.update('missing-id', { title: 'Nope' })).toBeUndefined()
    expect(store.list).toEqual([])
  })

  it('debounces persist for 1s and does not write on every change', () => {
    vi.useFakeTimers()
    const store = useNotesStore()
    const setItem = vi.spyOn(localStorage, 'setItem')

    const first = store.create({ title: 'One' })
    vi.advanceTimersByTime(NOTES_PERSIST_DEBOUNCE_MS - 1)
    store.update(first.id, { title: 'Two' })
    store.create({ title: 'Three' })

    expect(setItem).not.toHaveBeenCalled()
    expect(readPersisted()).toBeNull()

    vi.advanceTimersByTime(1)
    expect(setItem).not.toHaveBeenCalled()

    vi.advanceTimersByTime(NOTES_PERSIST_DEBOUNCE_MS - 1)
    expect(setItem).toHaveBeenCalledTimes(1)

    const persisted = readPersisted()
    expect(persisted?.schemaVersion).toBe(SCHEMA_VERSION)
    expect(persisted?.notes).toHaveLength(2)
    expect(persisted?.notes.map(note => note.title)).toEqual(['Two', 'Three'])
  })

  it('flushes pending persist on pagehide', () => {
    vi.useFakeTimers()
    const store = useNotesStore()
    store.create({ title: 'Draft' })

    expect(readPersisted()).toBeNull()
    browser.window.dispatchEvent(new Event('pagehide'))

    const persisted = readPersisted()
    expect(persisted?.schemaVersion).toBe(1)
    expect(persisted?.notes).toEqual([
      expect.objectContaining({ title: 'Draft', todos: [] }),
    ])
  })

  it('flushes pending persist when the page becomes hidden', () => {
    vi.useFakeTimers()
    const store = useNotesStore()
    store.create({ title: 'Hidden' })

    browser.document.visibilityState = 'hidden'
    browser.document.dispatchEvent(new Event('visibilitychange'))

    expect(readPersisted()?.notes[0]?.title).toBe('Hidden')
  })

  it('writes schemaVersion 1 when persisting', () => {
    vi.useFakeTimers()
    const store = useNotesStore()
    store.create({ title: 'Versioned' })
    vi.advanceTimersByTime(NOTES_PERSIST_DEBOUNCE_MS)

    expect(readPersisted()?.schemaVersion).toBe(1)
  })
})
