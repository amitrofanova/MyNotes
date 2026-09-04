import type { Note, PersistedState, Todo } from './types'

export const STORAGE_KEY = 'mynotes:data'
export const DRAFT_KEY_PREFIX = 'mynotes:draft:'
export const SCHEMA_VERSION = 1

export function draftKey(id: string): string {
  return `${DRAFT_KEY_PREFIX}${id}`
}

export function emptyState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    notes: [],
  }
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null
    }
    return localStorage
  }
  catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeTodo(value: unknown): Todo | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) {
    return null
  }

  return {
    id: value.id,
    text: typeof value.text === 'string' ? value.text : '',
    done: value.done === true,
  }
}

function normalizeNote(value: unknown): Note | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) {
    return null
  }

  const todos = Array.isArray(value.todos)
    ? value.todos.map(normalizeTodo).filter((todo): todo is Todo => todo !== null)
    : []

  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : '',
    todos,
  }
}

export function migrate(raw: unknown): PersistedState {
  if (Array.isArray(raw)) {
    return {
      schemaVersion: SCHEMA_VERSION,
      notes: raw.map(normalizeNote).filter((note): note is Note => note !== null),
    }
  }

  if (!isRecord(raw)) {
    return emptyState()
  }

  const notes = Array.isArray(raw.notes)
    ? raw.notes.map(normalizeNote).filter((note): note is Note => note !== null)
    : []

  return {
    schemaVersion: SCHEMA_VERSION,
    notes,
  }
}

export function load(): PersistedState {
  try {
    const storage = getStorage()
    if (!storage) {
      return emptyState()
    }

    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null || raw === '') {
      return emptyState()
    }

    return migrate(JSON.parse(raw))
  }
  catch {
    return emptyState()
  }
}

export function save(state: PersistedState): void {
  try {
    const storage = getStorage()
    if (!storage) {
      return
    }

    const payload: PersistedState = {
      schemaVersion: SCHEMA_VERSION,
      notes: state.notes,
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }
  catch {
    // Quota, private mode, or missing storage must not break the app.
  }
}

export function loadDraft(id: string): Note | null {
  if (id.length === 0) {
    return null
  }

  try {
    const storage = getStorage()
    if (!storage) {
      return null
    }

    const raw = storage.getItem(draftKey(id))
    if (raw === null || raw === '') {
      return null
    }

    const note = normalizeNote(JSON.parse(raw))
    if (note === null || note.id !== id) {
      return null
    }

    return note
  }
  catch {
    return null
  }
}

export function saveDraft(note: Note): void {
  if (note.id.length === 0) {
    return
  }

  try {
    const storage = getStorage()
    if (!storage) {
      return
    }

    const payload: Note = {
      id: note.id,
      title: note.title,
      todos: note.todos.map(todo => ({
        id: todo.id,
        text: todo.text,
        done: todo.done,
      })),
    }
    storage.setItem(draftKey(note.id), JSON.stringify(payload))
  }
  catch {
    // Quota, private mode, or missing storage must not break the app.
  }
}

export function removeDraft(id: string): void {
  if (id.length === 0) {
    return
  }

  try {
    const storage = getStorage()
    if (!storage) {
      return
    }

    storage.removeItem(draftKey(id))
  }
  catch {
    // Private mode or missing storage must not break the app.
  }
}
