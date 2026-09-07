import type { Note, Todo } from './types'

export const HISTORY_LIMIT = 50

export type HistoryPatch =
  | { type: 'setTitle', from: string, to: string }
  | { type: 'setTodoText', id: string, from: string, to: string }
  | { type: 'toggleTodo', id: string, from: boolean, to: boolean }
  | { type: 'addTodo', todo: Todo, index: number }
  | { type: 'removeTodo', todo: Todo, index: number }

export interface NoteHistory {
  push: (note: Note, patch: HistoryPatch) => Note
  undo: (note: Note) => Note
  redo: (note: Note) => Note
  commit: () => void
  clear: () => void
  peekLast: () => HistoryPatch | undefined
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

function clonePatch(patch: HistoryPatch): HistoryPatch {
  if (patch.type === 'addTodo' || patch.type === 'removeTodo') {
    return {
      type: patch.type,
      todo: cloneTodo(patch.todo),
      index: patch.index,
    }
  }

  return { ...patch }
}

function isTextPatch(patch: HistoryPatch): boolean {
  return patch.type === 'setTitle' || patch.type === 'setTodoText'
}

function canCoalesce(prev: HistoryPatch, next: HistoryPatch): boolean {
  if (prev.type === 'setTitle' && next.type === 'setTitle') {
    return true
  }

  return prev.type === 'setTodoText'
    && next.type === 'setTodoText'
    && prev.id === next.id
}

function coalesce(prev: HistoryPatch, next: HistoryPatch): HistoryPatch {
  if (prev.type === 'setTitle' && next.type === 'setTitle') {
    return {
      type: 'setTitle',
      from: prev.from,
      to: next.to,
    }
  }

  if (prev.type === 'setTodoText' && next.type === 'setTodoText' && prev.id === next.id) {
    return {
      type: 'setTodoText',
      id: prev.id,
      from: prev.from,
      to: next.to,
    }
  }

  return clonePatch(next)
}

export function invertPatch(patch: HistoryPatch): HistoryPatch {
  switch (patch.type) {
    case 'setTitle':
      return {
        type: 'setTitle',
        from: patch.to,
        to: patch.from,
      }
    case 'setTodoText':
      return {
        type: 'setTodoText',
        id: patch.id,
        from: patch.to,
        to: patch.from,
      }
    case 'toggleTodo':
      return {
        type: 'toggleTodo',
        id: patch.id,
        from: patch.to,
        to: patch.from,
      }
    case 'addTodo':
      return {
        type: 'removeTodo',
        todo: cloneTodo(patch.todo),
        index: patch.index,
      }
    case 'removeTodo':
      return {
        type: 'addTodo',
        todo: cloneTodo(patch.todo),
        index: patch.index,
      }
  }
}

export function applyPatch(note: Note, patch: HistoryPatch): Note {
  const next = cloneNote(note)

  switch (patch.type) {
    case 'setTitle':
      next.title = patch.to
      return next
    case 'setTodoText': {
      const todo = next.todos.find(item => item.id === patch.id)
      if (todo) {
        todo.text = patch.to
      }
      return next
    }
    case 'toggleTodo': {
      const todo = next.todos.find(item => item.id === patch.id)
      if (todo) {
        todo.done = patch.to
      }
      return next
    }
    case 'addTodo': {
      const index = Math.min(Math.max(patch.index, 0), next.todos.length)
      next.todos.splice(index, 0, cloneTodo(patch.todo))
      return next
    }
    case 'removeTodo': {
      const atIndex = next.todos[patch.index]
      if (atIndex?.id === patch.todo.id) {
        next.todos.splice(patch.index, 1)
        return next
      }

      const found = next.todos.findIndex(item => item.id === patch.todo.id)
      if (found !== -1) {
        next.todos.splice(found, 1)
      }
      return next
    }
  }
}

export function createHistory(limit = HISTORY_LIMIT): NoteHistory {
  const undoStack: HistoryPatch[] = []
  const redoStack: HistoryPatch[] = []
  let coalescing = false

  function trimUndo(): void {
    if (undoStack.length > limit) {
      undoStack.splice(0, undoStack.length - limit)
    }
  }

  function commit(): void {
    coalescing = false
  }

  function clear(): void {
    undoStack.length = 0
    redoStack.length = 0
    coalescing = false
  }

  function peekLast(): HistoryPatch | undefined {
    const last = undoStack[undoStack.length - 1]
    return last === undefined ? undefined : clonePatch(last)
  }

  function push(note: Note, patch: HistoryPatch): Note {
    redoStack.length = 0

    const last = undoStack[undoStack.length - 1]
    if (coalescing && last && canCoalesce(last, patch)) {
      undoStack[undoStack.length - 1] = coalesce(last, patch)
    }
    else {
      undoStack.push(clonePatch(patch))
      coalescing = isTextPatch(patch)
      trimUndo()
    }

    return applyPatch(note, patch)
  }

  function undo(note: Note): Note {
    coalescing = false
    const patch = undoStack.pop()
    if (!patch) {
      return note
    }

    redoStack.push(patch)
    return applyPatch(note, invertPatch(patch))
  }

  function redo(note: Note): Note {
    coalescing = false
    const patch = redoStack.pop()
    if (!patch) {
      return note
    }

    undoStack.push(patch)
    return applyPatch(note, patch)
  }

  return {
    push,
    undo,
    redo,
    commit,
    clear,
    peekLast,
  }
}
