import { createPinia, setActivePinia } from 'pinia'
import { effectScope, ref, type MaybeRefOrGetter } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorHotkeys } from '../../app/composables/useEditorHotkeys'
import {
  DRAFT_SAVE_DEBOUNCE_MS,
  NEW_NOTE_ID,
  TEXT_COMMIT_DEBOUNCE_MS,
  useNoteEditor,
  type NoteEditorSession,
} from '../../app/composables/useNoteEditor'
import { useNotesStore } from '../../app/stores/notes'
import { draftKey } from '../../app/utils/storage'
import type { Note, Todo } from '../../app/utils/types'
import { installBrowserStubs } from './helpers/browser'

function todo(id: string, text = id, done = false): Todo {
  return { id, text, done }
}

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Saved',
    todos: [],
    ...overrides,
  }
}

function setupEditor(id: MaybeRefOrGetter<string>): NoteEditorSession & { stop: () => void } {
  const scope = effectScope()
  const session = scope.run(() => useNoteEditor(id))
  if (!session) {
    throw new Error('expected editor session')
  }

  return {
    ...session,
    stop: () => scope.stop(),
  }
}

describe('useNoteEditor', () => {
  let stop: () => void = () => {}
  let browser: ReturnType<typeof installBrowserStubs>

  beforeEach(() => {
    browser = installBrowserStubs()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    stop()
    stop = () => {}
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('loads a working copy from the store without mutating it', () => {
    const store = useNotesStore()
    const saved = store.create({
      id: 'note-1',
      title: 'Saved',
      todos: [todo('t1', 'Milk')],
    })
    const editor = setupEditor('note-1')
    stop = editor.stop

    expect(editor.status.value).toBe('ready')
    expect(editor.note.value).toEqual(saved)
    expect(editor.note.value).not.toBe(store.getById('note-1'))

    editor.setTitle('Changed')
    expect(store.getById('note-1')?.title).toBe('Saved')
    expect(editor.isDirty.value).toBe(true)
  })

  it('creates a new empty note that is not in the store', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('generated-id')
    const store = useNotesStore()
    const editor = setupEditor(NEW_NOTE_ID)
    stop = editor.stop

    expect(editor.status.value).toBe('ready')
    expect(editor.note.value).toEqual({
      id: 'generated-id',
      title: '',
      todos: [],
    })
    expect(store.list).toEqual([])
    expect(editor.hasDraft.value).toBe(false)
    expect(editor.isDirty.value).toBe(false)
    expect(JSON.parse(localStorage.getItem(draftKey('generated-id'))!)).toEqual({
      id: 'generated-id',
      title: '',
      todos: [],
    })
  })

  it('keeps the session when the route id changes from new to the generated uuid', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('generated-id')
    const id = ref(NEW_NOTE_ID)
    const editor = setupEditor(id)
    stop = editor.stop

    editor.setTitle('Draft title')
    id.value = 'generated-id'

    expect(editor.status.value).toBe('ready')
    expect(editor.note.value?.id).toBe('generated-id')
    expect(editor.note.value?.title).toBe('Draft title')
  })

  it('reopens an empty new-note uuid as ready instead of missing', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('generated-id')
    const editor = setupEditor(NEW_NOTE_ID)
    stop = editor.stop

    editor.stop()
    const reopened = setupEditor('generated-id')
    stop = reopened.stop

    expect(reopened.status.value).toBe('ready')
    expect(reopened.note.value).toEqual({
      id: 'generated-id',
      title: '',
      todos: [],
    })
    expect(reopened.hasDraft.value).toBe(false)
    expect(useNotesStore().getById('generated-id')).toBeUndefined()
  })

  it('flushes a pending draft on pagehide before debounce', () => {
    vi.useFakeTimers()
    useNotesStore().create({ id: 'note-1', title: 'Saved', todos: [] })
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.setTitle('Typed')
    expect(localStorage.getItem(draftKey('note-1'))).toBeNull()

    browser.window.dispatchEvent(new Event('pagehide'))

    expect(JSON.parse(localStorage.getItem(draftKey('note-1'))!)).toEqual({
      id: 'note-1',
      title: 'Typed',
      todos: [],
    })
  })

  it('flushes a pending draft when the page becomes hidden', () => {
    vi.useFakeTimers()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('generated-id')
    const editor = setupEditor(NEW_NOTE_ID)
    stop = editor.stop

    editor.setTitle('Hidden')
    browser.document.visibilityState = 'hidden'
    browser.document.dispatchEvent(new Event('visibilitychange'))

    expect(JSON.parse(localStorage.getItem(draftKey('generated-id'))!).title).toBe('Hidden')
  })

  it('does not overwrite a pending restore draft on pagehide', () => {
    useNotesStore().create({ id: 'note-1', title: 'Saved', todos: [] })
    localStorage.setItem(draftKey('note-1'), JSON.stringify(note({ title: 'Unsaved' })))
    const editor = setupEditor('note-1')
    stop = editor.stop

    expect(editor.hasDraft.value).toBe(true)
    browser.window.dispatchEvent(new Event('pagehide'))

    expect(JSON.parse(localStorage.getItem(draftKey('note-1'))!)).toEqual(note({
      title: 'Unsaved',
    }))
  })

  it('does not rewrite a cancelled new-note draft on dispose', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('generated-id')
    const editor = setupEditor(NEW_NOTE_ID)
    stop = editor.stop

    editor.setTitle('Leave')
    editor.cancel()

    expect(localStorage.getItem(draftKey('generated-id'))).toBeNull()
    editor.stop()
    stop = () => {}
    expect(localStorage.getItem(draftKey('generated-id'))).toBeNull()
  })

  it('sets missing when the note is gone and does not throw', () => {
    const editor = setupEditor('deleted-id')
    stop = editor.stop

    expect(editor.status.value).toBe('missing')
    expect(editor.note.value).toBeNull()
    expect(editor.hasDraft.value).toBe(false)

    expect(() => {
      editor.setTitle('Nope')
      editor.setTodoText('t1', 'Nope')
      editor.toggleTodo('t1')
      editor.addTodo('Nope')
      editor.removeTodo('t1')
      editor.commitText()
      editor.blurTodo('t1')
      editor.undo()
      editor.redo()
      editor.save()
      editor.cancel()
      editor.restoreDraft()
      editor.discardDraft()
    }).not.toThrow()

    expect(useNotesStore().list).toEqual([])
  })

  it('pushes title edits through history and undoes them', () => {
    useNotesStore().create({ id: 'note-1', title: '', todos: [] })
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.setTitle('Hello')
    editor.commitText()
    expect(editor.note.value?.title).toBe('Hello')

    editor.undo()
    expect(editor.note.value?.title).toBe('')

    editor.redo()
    expect(editor.note.value?.title).toBe('Hello')
  })

  it('commits coalesced typing after the text debounce so the next edit is a new entry', () => {
    vi.useFakeTimers()
    useNotesStore().create({ id: 'note-1', title: '', todos: [] })
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.setTitle('H')
    editor.setTitle('He')
    editor.setTitle('Hello')
    expect(editor.hasUncommittedText.value).toBe(true)

    vi.advanceTimersByTime(TEXT_COMMIT_DEBOUNCE_MS)
    expect(editor.hasUncommittedText.value).toBe(false)

    editor.setTitle('Hello!')
    editor.commitText()

    editor.undo()
    expect(editor.note.value?.title).toBe('Hello')
    editor.undo()
    expect(editor.note.value?.title).toBe('')
  })

  it('commits the current text field on blur so the next change is a new history entry', () => {
    useNotesStore().create({ id: 'note-1', title: '', todos: [] })
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.setTitle('Hello')
    editor.commitText()
    editor.setTitle('Hello!')
    editor.commitText()

    editor.undo()
    expect(editor.note.value?.title).toBe('Hello')
  })

  it('treats checkbox, add, and delete as atomic history entries', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('t2')
    useNotesStore().create({
      id: 'note-1',
      title: '',
      todos: [todo('t1', 'One')],
    })
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.addTodo('Two')
    editor.toggleTodo('t1')
    editor.removeTodo('t2')

    expect(editor.note.value?.todos).toEqual([todo('t1', 'One', true)])

    editor.undo()
    expect(editor.note.value?.todos).toEqual([
      todo('t1', 'One', true),
      todo('t2', 'Two'),
    ])

    editor.undo()
    expect(editor.note.value?.todos).toEqual([
      todo('t1', 'One'),
      todo('t2', 'Two'),
    ])

    editor.undo()
    expect(editor.note.value?.todos).toEqual([todo('t1', 'One')])
  })

  it('does not add an empty todo', () => {
    useNotesStore().create({ id: 'note-1', title: '', todos: [] })
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.addTodo('   ')
    expect(editor.note.value?.todos).toEqual([])
    expect(editor.isDirty.value).toBe(false)
  })

  it('removes a todo whose text is empty after blur', () => {
    useNotesStore().create({
      id: 'note-1',
      title: '',
      todos: [todo('t1', 'Keep'), todo('t2', 'Drop')],
    })
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.setTodoText('t2', '   ')
    editor.blurTodo('t2')

    expect(editor.note.value?.todos).toEqual([todo('t1', 'Keep')])
    editor.undo()
    expect(editor.note.value?.todos).toEqual([
      todo('t1', 'Keep'),
      todo('t2', 'Drop'),
    ])
  })

  it('saves the working copy to the store, clears history, and removes the draft', () => {
    vi.useFakeTimers()
    const store = useNotesStore()
    store.create({
      id: 'note-1',
      title: 'Saved',
      todos: [todo('t1', 'Old')],
    })
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.setTitle('Updated')
    editor.setTodoText('t1', 'New')
    vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS)
    expect(localStorage.getItem(draftKey('note-1'))).not.toBeNull()
    expect(editor.hasDraft.value).toBe(true)

    editor.save()

    expect(store.getById('note-1')).toEqual(note({
      title: 'Updated',
      todos: [todo('t1', 'New')],
    }))
    expect(editor.note.value?.title).toBe('Updated')
    expect(editor.isDirty.value).toBe(false)
    expect(editor.hasDraft.value).toBe(false)
    expect(localStorage.getItem(draftKey('note-1'))).toBeNull()

    editor.undo()
    expect(editor.note.value?.title).toBe('Updated')
  })

  it('saves a new note into the store under the working-copy id', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('generated-id')
    const store = useNotesStore()
    const editor = setupEditor(NEW_NOTE_ID)
    stop = editor.stop

    editor.setTitle('Fresh')
    editor.save()

    expect(store.getById('generated-id')).toEqual({
      id: 'generated-id',
      title: 'Fresh',
      todos: [],
    })
    expect(editor.hasDraft.value).toBe(false)
  })

  it('cancel restores the baseline, clears history and draft, and leaves the store unchanged', () => {
    vi.useFakeTimers()
    const store = useNotesStore()
    store.create({ id: 'note-1', title: 'Saved', todos: [] })
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.setTitle('Edited')
    vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS)
    expect(localStorage.getItem(draftKey('note-1'))).not.toBeNull()

    editor.cancel()

    expect(editor.note.value?.title).toBe('Saved')
    expect(store.getById('note-1')?.title).toBe('Saved')
    expect(editor.isDirty.value).toBe(false)
    expect(editor.hasDraft.value).toBe(false)
    expect(localStorage.getItem(draftKey('note-1'))).toBeNull()

    editor.undo()
    expect(editor.note.value?.title).toBe('Saved')
  })

  it('loads a saved note when a draft exists and exposes the draft flag', () => {
    useNotesStore().create({ id: 'note-1', title: 'Saved', todos: [] })
    localStorage.setItem(draftKey('note-1'), JSON.stringify(note({ title: 'Unsaved' })))
    const editor = setupEditor('note-1')
    stop = editor.stop

    expect(editor.note.value?.title).toBe('Saved')
    expect(editor.hasDraft.value).toBe(true)
    expect(editor.isDirty.value).toBe(false)
  })

  it('restoreDraft applies the stored draft to the working copy', () => {
    useNotesStore().create({ id: 'note-1', title: 'Saved', todos: [] })
    localStorage.setItem(draftKey('note-1'), JSON.stringify(note({ title: 'Unsaved' })))
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.restoreDraft()

    expect(editor.note.value?.title).toBe('Unsaved')
    expect(editor.isDirty.value).toBe(true)
    expect(useNotesStore().getById('note-1')?.title).toBe('Saved')
  })

  it('keeps a placeholder draft after discarding an unsaved restore', () => {
    localStorage.setItem(draftKey('generated-id'), JSON.stringify({
      id: 'generated-id',
      title: 'Unsaved',
      todos: [],
    }))
    const editor = setupEditor('generated-id')
    stop = editor.stop

    editor.discardDraft()

    expect(editor.note.value).toEqual({
      id: 'generated-id',
      title: '',
      todos: [],
    })
    expect(editor.hasDraft.value).toBe(false)
    expect(JSON.parse(localStorage.getItem(draftKey('generated-id'))!)).toEqual({
      id: 'generated-id',
      title: '',
      todos: [],
    })
  })

  it('discardDraft drops the stored draft and keeps the saved working copy', () => {
    useNotesStore().create({ id: 'note-1', title: 'Saved', todos: [] })
    localStorage.setItem(draftKey('note-1'), JSON.stringify(note({ title: 'Unsaved' })))
    const editor = setupEditor('note-1')
    stop = editor.stop

    editor.discardDraft()

    expect(editor.note.value?.title).toBe('Saved')
    expect(editor.hasDraft.value).toBe(false)
    expect(localStorage.getItem(draftKey('note-1'))).toBeNull()
  })

  it('writes a draft after debounce and reopens an unsaved new note as ready with hasDraft', () => {
    vi.useFakeTimers()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('generated-id')
    const editor = setupEditor(NEW_NOTE_ID)
    stop = editor.stop

    editor.setTitle('In progress')
    vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS)

    const raw = localStorage.getItem(draftKey('generated-id'))
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual({
      id: 'generated-id',
      title: 'In progress',
      todos: [],
    })
    expect(editor.hasDraft.value).toBe(true)

    editor.stop()
    const reopened = setupEditor('generated-id')
    stop = reopened.stop

    expect(reopened.status.value).toBe('ready')
    expect(reopened.note.value).toEqual({
      id: 'generated-id',
      title: '',
      todos: [],
    })
    expect(reopened.hasDraft.value).toBe(true)
    expect(useNotesStore().getById('generated-id')).toBeUndefined()
  })

  it('ignores a broken draft and does not throw', () => {
    useNotesStore().create({ id: 'note-1', title: 'Saved', todos: [] })
    localStorage.setItem(draftKey('note-1'), '{not-json')
    const editor = setupEditor('note-1')
    stop = editor.stop

    expect(editor.status.value).toBe('ready')
    expect(editor.note.value?.title).toBe('Saved')
    expect(editor.hasDraft.value).toBe(false)
  })
})

describe('useEditorHotkeys', () => {
  function keyEvent(overrides: Partial<{
    key: string
    code: string
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    tagName: string
  }> = {}) {
    return {
      key: overrides.key ?? 'z',
      code: overrides.code,
      ctrlKey: overrides.ctrlKey ?? true,
      metaKey: overrides.metaKey ?? false,
      shiftKey: overrides.shiftKey ?? false,
      target: { tagName: overrides.tagName ?? 'DIV' } as unknown as EventTarget,
      preventDefault: vi.fn(),
    }
  }

  it('runs app undo on Ctrl+Z when the field is not mid-typing', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    const { handleKeydown } = useEditorHotkeys({
      undo,
      redo,
      hasUncommittedText: () => false,
    })
    const event = keyEvent({ tagName: 'INPUT' })

    expect(handleKeydown(event)).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(undo).toHaveBeenCalledOnce()
    expect(redo).not.toHaveBeenCalled()
  })

  it('does not intercept native undo while uncommitted text is focused in a field', () => {
    const undo = vi.fn()
    const { handleKeydown } = useEditorHotkeys({
      undo,
      redo: vi.fn(),
      hasUncommittedText: () => true,
    })
    const event = keyEvent({ tagName: 'TEXTAREA' })

    expect(handleKeydown(event)).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(undo).not.toHaveBeenCalled()
  })

  it('does not intercept native undo in the new-item field when it reports uncommitted text', () => {
    const undo = vi.fn()
    const { handleKeydown } = useEditorHotkeys({
      undo,
      redo: vi.fn(),
      hasUncommittedText: () => true,
    })
    const event = keyEvent({ tagName: 'INPUT' })

    expect(handleKeydown(event)).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(undo).not.toHaveBeenCalled()
  })

  it('runs app redo on Shift+Ctrl+Z and Meta+Shift+Z', () => {
    const redo = vi.fn()
    const { handleKeydown } = useEditorHotkeys({
      undo: vi.fn(),
      redo,
      hasUncommittedText: () => false,
    })

    const ctrlEvent = keyEvent({ shiftKey: true })
    expect(handleKeydown(ctrlEvent)).toBe(true)
    expect(ctrlEvent.preventDefault).toHaveBeenCalledOnce()

    const metaEvent = keyEvent({
      ctrlKey: false,
      metaKey: true,
      shiftKey: true,
    })
    expect(handleKeydown(metaEvent)).toBe(true)
    expect(redo).toHaveBeenCalledTimes(2)
  })

  it('ignores keys that are not undo/redo', () => {
    const undo = vi.fn()
    const { handleKeydown } = useEditorHotkeys({
      undo,
      redo: vi.fn(),
      hasUncommittedText: () => false,
    })
    const event = keyEvent({ key: 'y', code: 'KeyY' })

    expect(handleKeydown(event)).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(undo).not.toHaveBeenCalled()
  })

  it('runs app undo on Ctrl+Я in the Russian layout', () => {
    const undo = vi.fn()
    const { handleKeydown } = useEditorHotkeys({
      undo,
      redo: vi.fn(),
      hasUncommittedText: () => false,
    })
    const event = keyEvent({ key: 'я', code: 'KeyZ', tagName: 'INPUT' })

    expect(handleKeydown(event)).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(undo).toHaveBeenCalledOnce()
  })

  it('runs app redo on Shift+Ctrl+Я', () => {
    const redo = vi.fn()
    const { handleKeydown } = useEditorHotkeys({
      undo: vi.fn(),
      redo,
      hasUncommittedText: () => false,
    })
    const event = keyEvent({ key: 'Я', code: 'KeyZ', shiftKey: true })

    expect(handleKeydown(event)).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(redo).toHaveBeenCalledOnce()
  })

  it('treats the physical KeyZ as undo when Ctrl changes event.key', () => {
    const undo = vi.fn()
    const { handleKeydown } = useEditorHotkeys({
      undo,
      redo: vi.fn(),
      hasUncommittedText: () => false,
    })
    const event = keyEvent({ key: 'Control', code: 'KeyZ' })

    expect(handleKeydown(event)).toBe(true)
    expect(undo).toHaveBeenCalledOnce()
  })

  it('does not intercept native undo for uncommitted Russian-layout typing', () => {
    const undo = vi.fn()
    const { handleKeydown } = useEditorHotkeys({
      undo,
      redo: vi.fn(),
      hasUncommittedText: () => true,
    })
    const event = keyEvent({ key: 'я', code: 'KeyZ', tagName: 'INPUT' })

    expect(handleKeydown(event)).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(undo).not.toHaveBeenCalled()
  })
})
