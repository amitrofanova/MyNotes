import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref } from 'vue'
import { load, save, SCHEMA_VERSION } from '../utils/storage'
import type { Note, Todo } from '../utils/types'

export const NOTES_PERSIST_DEBOUNCE_MS = 1000

function cloneTodos(todos: readonly Todo[] | undefined): Todo[] {
  if (!todos) {
    return []
  }

  return todos.map(todo => ({
    id: todo.id,
    text: todo.text,
    done: todo.done,
  }))
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>(load().notes)
  const list = computed(() => notes.value)

  let persistTimer: ReturnType<typeof setTimeout> | null = null
  let persistPending = false

  function persistNow(): void {
    if (persistTimer !== null) {
      clearTimeout(persistTimer)
      persistTimer = null
    }

    if (!persistPending) {
      return
    }

    persistPending = false
    save({
      schemaVersion: SCHEMA_VERSION,
      notes: notes.value,
    })
  }

  function schedulePersist(): void {
    persistPending = true

    if (persistTimer !== null) {
      clearTimeout(persistTimer)
    }

    persistTimer = setTimeout(() => {
      persistTimer = null
      persistNow()
    }, NOTES_PERSIST_DEBOUNCE_MS)
  }

  function handleVisibilityChange(): void {
    if (typeof document === 'undefined') {
      return
    }

    if (document.visibilityState === 'hidden') {
      persistNow()
    }
  }

  function bindFlushEvents(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', persistNow)
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  }

  function unbindFlushEvents(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', persistNow)
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }

  function getById(id: string): Note | undefined {
    return notes.value.find(note => note.id === id)
  }

  function create(input: Partial<Pick<Note, 'id' | 'title' | 'todos'>> = {}): Note {
    const note: Note = {
      id: input.id && input.id.length > 0 ? input.id : crypto.randomUUID(),
      title: input.title ?? '',
      todos: cloneTodos(input.todos),
    }
    notes.value = [...notes.value, note]
    schedulePersist()
    return note
  }

  function update(id: string, patch: Partial<Pick<Note, 'title' | 'todos'>>): Note | undefined {
    const index = notes.value.findIndex(note => note.id === id)
    if (index === -1) {
      return undefined
    }

    const current = notes.value[index]
    if (!current) {
      return undefined
    }

    const next: Note = {
      id: current.id,
      title: patch.title ?? current.title,
      todos: patch.todos ? cloneTodos(patch.todos) : current.todos,
    }
    notes.value = notes.value.map((note, noteIndex) => noteIndex === index ? next : note)
    schedulePersist()
    return next
  }

  function remove(id: string): void {
    const next = notes.value.filter(note => note.id !== id)
    if (next.length === notes.value.length) {
      return
    }

    notes.value = next
    schedulePersist()
  }

  function syncFromStorage(): void {
    if (persistTimer !== null) {
      clearTimeout(persistTimer)
      persistTimer = null
    }

    persistPending = false
    notes.value = load().notes
  }

  bindFlushEvents()

  onScopeDispose(() => {
    if (persistTimer !== null) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    unbindFlushEvents()
  })

  return {
    list,
    getById,
    create,
    update,
    remove,
    syncFromStorage,
  }
})
