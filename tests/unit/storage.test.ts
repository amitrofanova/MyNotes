import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyState, load, migrate, save, SCHEMA_VERSION, STORAGE_KEY } from '../../app/utils/storage'
import type { Note, PersistedState } from '../../app/utils/types'
import { installBrowserStubs } from './helpers/browser'

const sampleNote: Note = {
  id: 'note-1',
  title: 'Shopping',
  todos: [{ id: 'todo-1', text: 'Milk', done: false }],
}

describe('storage', () => {
  beforeEach(() => {
    installBrowserStubs()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('loads an empty state when storage is missing', () => {
    expect(load()).toEqual(emptyState())
    expect(load().schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('loads an empty state when the stored value is an empty string', () => {
    localStorage.setItem(STORAGE_KEY, '')
    expect(load()).toEqual({ schemaVersion: 1, notes: [] })
  })

  it('does not throw on broken JSON and returns an empty state', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    expect(() => load()).not.toThrow()
    expect(load()).toEqual({ schemaVersion: 1, notes: [] })
  })

  it('loads valid persisted notes', () => {
    const state: PersistedState = {
      schemaVersion: 1,
      notes: [sampleNote],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    expect(load()).toEqual(state)
  })

  it('migrates unversioned payloads to schemaVersion 1', () => {
    const migrated = migrate({ notes: [sampleNote] })
    expect(migrated.schemaVersion).toBe(1)
    expect(migrated.notes).toEqual([sampleNote])
  })

  it('migrates a bare notes array to schemaVersion 1', () => {
    const migrated = migrate([sampleNote])
    expect(migrated).toEqual({
      schemaVersion: 1,
      notes: [sampleNote],
    })
  })

  it('drops invalid notes and todos while migrating', () => {
    const migrated = migrate({
      schemaVersion: 0,
      notes: [
        { title: 'no id' },
        {
          id: 'keep',
          title: 42,
          todos: [
            { id: 'ok', text: 'Task', done: true },
            { text: 'missing id' },
            null,
          ],
        },
      ],
    })

    expect(migrated).toEqual({
      schemaVersion: 1,
      notes: [
        {
          id: 'keep',
          title: '',
          todos: [{ id: 'ok', text: 'Task', done: true }],
        },
      ],
    })
  })

  it('saves schemaVersion 1 and round-trips notes', () => {
    save({ schemaVersion: 99, notes: [sampleNote] })

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as PersistedState
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.notes).toEqual([sampleNote])
    expect(load()).toEqual({
      schemaVersion: 1,
      notes: [sampleNote],
    })
  })
})
