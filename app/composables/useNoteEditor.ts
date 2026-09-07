import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { computed, onScopeDispose, ref, toValue, watch } from 'vue'
import { useNotesStore } from '../stores/notes'
import { createHistory } from '../utils/history'
import { loadDraft, removeDraft, saveDraft } from '../utils/storage'
import type { Note, Todo } from '../utils/types'

export const NEW_NOTE_ID = 'new'
export const TEXT_COMMIT_DEBOUNCE_MS = 400
export const DRAFT_SAVE_DEBOUNCE_MS = 400

export type EditorStatus = 'ready' | 'missing'

export interface NoteEditorSession {
  status: Ref<EditorStatus>
  note: Ref<Note | null>
  hasDraft: Ref<boolean>
  isDirty: ComputedRef<boolean>
  hasUncommittedText: Ref<boolean>
  setTitle: (title: string) => void
  setTodoText: (id: string, text: string) => void
  toggleTodo: (id: string) => void
  addTodo: (text: string) => void
  removeTodo: (id: string) => void
  commitText: () => void
  blurTodo: (id: string) => void
  undo: () => void
  redo: () => void
  save: () => void
  cancel: () => void
  restoreDraft: () => void
  discardDraft: () => void
}

function cloneTodo(todo: Todo): Todo {
  return {
    id: todo.id,
    text: todo.text,
    done: todo.done,
  }
}

function cloneNote(note: Note): Note {
  return {
    id: note.id,
    title: note.title,
    todos: note.todos.map(cloneTodo),
  }
}

function emptyNote(id: string): Note {
  return {
    id,
    title: '',
    todos: [],
  }
}

function notesEqual(left: Note, right: Note): boolean {
  if (left.id !== right.id || left.title !== right.title || left.todos.length !== right.todos.length) {
    return false
  }

  return left.todos.every((todo, index) => {
    const other = right.todos[index]
    return other !== undefined
      && todo.id === other.id
      && todo.text === other.text
      && todo.done === other.done
  })
}

export function useNoteEditor(noteId: MaybeRefOrGetter<string>): NoteEditorSession {
  const store = useNotesStore()
  const history = createHistory()

  const status = ref<EditorStatus>('ready')
  const note = ref<Note | null>(null)
  const baseline = ref<Note | null>(null)
  const hasDraft = ref(false)
  const hasUncommittedText = ref(false)

  let textCommitTimer: ReturnType<typeof setTimeout> | null = null
  let draftSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipDraftFlush = false

  const isDirty = computed(() => {
    if (note.value === null || baseline.value === null) {
      return false
    }

    return !notesEqual(note.value, baseline.value)
  })

  function clearTextCommitTimer(): void {
    if (textCommitTimer !== null) {
      clearTimeout(textCommitTimer)
      textCommitTimer = null
    }
    hasUncommittedText.value = false
  }

  function clearDraftSaveTimer(): void {
    if (draftSaveTimer !== null) {
      clearTimeout(draftSaveTimer)
      draftSaveTimer = null
    }
  }

  function isUnsaved(id: string): boolean {
    return store.getById(id) === undefined
  }

  function persistPlaceholderDraft(payload: Note): void {
    saveDraft(payload)
    hasDraft.value = false
  }

  function persistDraftNow(): void {
    if (skipDraftFlush) {
      return
    }

    clearDraftSaveTimer()

    const current = note.value
    const saved = baseline.value
    if (status.value !== 'ready' || current === null || saved === null) {
      return
    }

    if (notesEqual(current, saved)) {
      if (hasDraft.value) {
        return
      }

      if (isUnsaved(current.id)) {
        persistPlaceholderDraft(current)
        return
      }

      removeDraft(current.id)
      hasDraft.value = false
      return
    }

    saveDraft(current)
    hasDraft.value = true
  }

  function handleVisibilityChange(): void {
    if (typeof document === 'undefined') {
      return
    }

    if (document.visibilityState === 'hidden') {
      persistDraftNow()
    }
  }

  function bindFlushEvents(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', persistDraftNow)
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  }

  function unbindFlushEvents(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', persistDraftNow)
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }

  function scheduleDraftSave(): void {
    if (status.value !== 'ready' || note.value === null) {
      return
    }

    clearDraftSaveTimer()
    draftSaveTimer = setTimeout(() => {
      draftSaveTimer = null
      persistDraftNow()
    }, DRAFT_SAVE_DEBOUNCE_MS)
  }

  function scheduleTextCommit(): void {
    clearTextCommitTimer()
    hasUncommittedText.value = true
    textCommitTimer = setTimeout(() => {
      textCommitTimer = null
      hasUncommittedText.value = false
      history.commit()
    }, TEXT_COMMIT_DEBOUNCE_MS)
  }

  function commitText(): void {
    clearTextCommitTimer()
    history.commit()
  }

  function isActive(): boolean {
    return status.value === 'ready' && note.value !== null
  }

  function open(rawId: string): void {
    if (status.value === 'ready' && note.value !== null && rawId === note.value.id) {
      return
    }

    persistDraftNow()
    clearTextCommitTimer()
    history.clear()
    skipDraftFlush = false

    if (rawId === NEW_NOTE_ID || rawId === '') {
      const created = emptyNote(crypto.randomUUID())
      baseline.value = cloneNote(created)
      note.value = cloneNote(created)
      status.value = 'ready'
      persistPlaceholderDraft(created)
      return
    }

    const saved = store.getById(rawId)
    const draft = loadDraft(rawId)

    if (saved === undefined) {
      if (draft === null) {
        baseline.value = null
        note.value = null
        status.value = 'missing'
        hasDraft.value = false
        return
      }

      const unsaved = emptyNote(rawId)
      baseline.value = cloneNote(unsaved)
      note.value = cloneNote(unsaved)
      status.value = 'ready'
      hasDraft.value = !notesEqual(draft, unsaved)
      return
    }

    baseline.value = cloneNote(saved)
    note.value = cloneNote(saved)
    status.value = 'ready'
    hasDraft.value = draft !== null && !notesEqual(draft, saved)
  }

  function setTitle(title: string): void {
    const current = note.value
    if (!isActive() || current === null || current.title === title) {
      return
    }

    note.value = history.push(current, {
      type: 'setTitle',
      from: current.title,
      to: title,
    })
    scheduleTextCommit()
    scheduleDraftSave()
  }

  function setTodoText(id: string, text: string): void {
    const current = note.value
    if (!isActive() || current === null) {
      return
    }

    const todo = current.todos.find(item => item.id === id)
    if (!todo || todo.text === text) {
      return
    }

    note.value = history.push(current, {
      type: 'setTodoText',
      id,
      from: todo.text,
      to: text,
    })
    scheduleTextCommit()
    scheduleDraftSave()
  }

  function toggleTodo(id: string): void {
    const current = note.value
    if (!isActive() || current === null) {
      return
    }

    const todo = current.todos.find(item => item.id === id)
    if (!todo) {
      return
    }

    commitText()
    note.value = history.push(current, {
      type: 'toggleTodo',
      id,
      from: todo.done,
      to: !todo.done,
    })
    scheduleDraftSave()
  }

  function addTodo(text: string): void {
    const current = note.value
    if (!isActive() || current === null) {
      return
    }

    const trimmed = text.trim()
    if (trimmed.length === 0) {
      return
    }

    commitText()
    const todo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      done: false,
    }
    note.value = history.push(current, {
      type: 'addTodo',
      todo,
      index: current.todos.length,
    })
    scheduleDraftSave()
  }

  function removeTodo(id: string): void {
    const current = note.value
    if (!isActive() || current === null) {
      return
    }

    const index = current.todos.findIndex(item => item.id === id)
    const todo = current.todos[index]
    if (index === -1 || !todo) {
      return
    }

    commitText()
    note.value = history.push(current, {
      type: 'removeTodo',
      todo: cloneTodo(todo),
      index,
    })
    scheduleDraftSave()
  }

  function blurTodo(id: string): void {
    const current = note.value
    if (!isActive() || current === null) {
      return
    }

    const todo = current.todos.find(item => item.id === id)
    if (!todo) {
      commitText()
      return
    }

    if (todo.text.trim().length === 0) {
      clearTextCommitTimer()
      const last = history.peekLast()
      if (last?.type === 'setTodoText' && last.id === id) {
        note.value = history.undo(current)
      }
      removeTodo(id)
      return
    }

    commitText()
  }

  function undo(): void {
    const current = note.value
    if (!isActive() || current === null) {
      return
    }

    clearTextCommitTimer()
    note.value = history.undo(current)
    scheduleDraftSave()
  }

  function redo(): void {
    const current = note.value
    if (!isActive() || current === null) {
      return
    }

    clearTextCommitTimer()
    note.value = history.redo(current)
    scheduleDraftSave()
  }

  function save(): void {
    const current = note.value
    if (!isActive() || current === null) {
      return
    }

    commitText()
    clearDraftSaveTimer()

    const payload = cloneNote(current)
    if (store.getById(payload.id) === undefined) {
      store.create({
        id: payload.id,
        title: payload.title,
        todos: payload.todos,
      })
    }
    else {
      store.update(payload.id, {
        title: payload.title,
        todos: payload.todos,
      })
    }

    history.clear()
    removeDraft(payload.id)
    baseline.value = cloneNote(payload)
    note.value = payload
    hasDraft.value = false
    skipDraftFlush = false
  }

  function cancel(): void {
    const current = note.value
    const saved = baseline.value
    if (!isActive() || current === null || saved === null) {
      return
    }

    commitText()
    clearDraftSaveTimer()
    history.clear()
    removeDraft(current.id)
    note.value = cloneNote(saved)
    hasDraft.value = false
    skipDraftFlush = true
  }

  function restoreDraft(): void {
    const current = note.value
    if (!isActive() || current === null) {
      return
    }

    const draft = loadDraft(current.id)
    if (draft === null) {
      hasDraft.value = false
      return
    }

    commitText()
    history.clear()
    note.value = cloneNote(draft)
    scheduleDraftSave()
  }

  function discardDraft(): void {
    const current = note.value
    const saved = baseline.value
    if (!isActive() || current === null || saved === null) {
      return
    }

    commitText()
    clearDraftSaveTimer()
    history.clear()
    note.value = cloneNote(saved)
    if (isUnsaved(current.id)) {
      persistPlaceholderDraft(saved)
    }
    else {
      removeDraft(current.id)
      hasDraft.value = false
    }
    skipDraftFlush = false
  }

  watch(
    () => toValue(noteId),
    (id) => {
      open(id)
    },
    { immediate: true, flush: 'sync' },
  )

  bindFlushEvents()

  onScopeDispose(() => {
    clearTextCommitTimer()
    persistDraftNow()
    unbindFlushEvents()
  })

  return {
    status,
    note,
    hasDraft,
    isDirty,
    hasUncommittedText,
    setTitle,
    setTodoText,
    toggleTodo,
    addTodo,
    removeTodo,
    commitText,
    blurTodo,
    undo,
    redo,
    save,
    cancel,
    restoreDraft,
    discardDraft,
  }
}
