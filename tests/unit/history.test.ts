import { describe, expect, it } from 'vitest'
import {
  applyPatch,
  createHistory,
  HISTORY_LIMIT,
  invertPatch,
  type HistoryPatch,
} from '../../app/utils/history'
import type { Note, Todo } from '../../app/utils/types'

function todo(id: string, text = id, done = false): Todo {
  return { id, text, done }
}

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: '',
    todos: [],
    ...overrides,
  }
}

describe('applyPatch / invertPatch', () => {
  it('applies setTitle without mutating the original note', () => {
    const original = note({ title: 'Old' })
    const patched = applyPatch(original, { type: 'setTitle', from: 'Old', to: 'New' })

    expect(patched).toEqual(note({ title: 'New' }))
    expect(original).toEqual(note({ title: 'Old' }))
    expect(patched).not.toBe(original)
  })

  it('inverts setTitle and round-trips', () => {
    const start = note({ title: 'A' })
    const patch: HistoryPatch = { type: 'setTitle', from: 'A', to: 'B' }
    const inverted = invertPatch(patch)

    expect(inverted).toEqual({ type: 'setTitle', from: 'B', to: 'A' })
    expect(applyPatch(applyPatch(start, patch), inverted)).toEqual(start)
  })

  it('applies and inverts setTodoText on one item', () => {
    const start = note({ todos: [todo('t1', 'Buy')] })
    const patch: HistoryPatch = { type: 'setTodoText', id: 't1', from: 'Buy', to: 'Buy milk' }
    const inverted = invertPatch(patch)

    expect(applyPatch(start, patch).todos[0]?.text).toBe('Buy milk')
    expect(inverted).toEqual({ type: 'setTodoText', id: 't1', from: 'Buy milk', to: 'Buy' })
    expect(applyPatch(applyPatch(start, patch), inverted)).toEqual(start)
  })

  it('applies and inverts toggleTodo', () => {
    const start = note({ todos: [todo('t1', 'Task', false)] })
    const patch: HistoryPatch = { type: 'toggleTodo', id: 't1', from: false, to: true }
    const inverted = invertPatch(patch)

    expect(applyPatch(start, patch).todos[0]?.done).toBe(true)
    expect(inverted).toEqual({ type: 'toggleTodo', id: 't1', from: true, to: false })
    expect(applyPatch(applyPatch(start, patch), inverted)).toEqual(start)
  })

  it('inverts addTodo into removeTodo and restores the note', () => {
    const added = todo('t2', 'Second')
    const start = note({ todos: [todo('t1', 'First')] })
    const patch: HistoryPatch = { type: 'addTodo', todo: added, index: 1 }
    const inverted = invertPatch(patch)

    expect(inverted).toEqual({ type: 'removeTodo', todo: added, index: 1 })
    expect(applyPatch(start, patch).todos.map(item => item.id)).toEqual(['t1', 't2'])
    expect(applyPatch(applyPatch(start, patch), inverted)).toEqual(start)
  })

  it('inverts removeTodo into addTodo and puts the item back at its index', () => {
    const middle = todo('t2', 'Middle')
    const start = note({
      todos: [todo('t1', 'First'), middle, todo('t3', 'Last')],
    })
    const patch: HistoryPatch = { type: 'removeTodo', todo: middle, index: 1 }
    const inverted = invertPatch(patch)

    expect(inverted).toEqual({ type: 'addTodo', todo: middle, index: 1 })
    expect(applyPatch(start, patch).todos.map(item => item.id)).toEqual(['t1', 't3'])
    expect(applyPatch(applyPatch(start, patch), inverted)).toEqual(start)
  })

  it('does not keep a shared todo reference in add/remove patches', () => {
    const item = todo('t1', 'Live')
    const add: HistoryPatch = { type: 'addTodo', todo: item, index: 0 }
    const inverted = invertPatch(add)
    item.text = 'Mutated'

    expect(add.type === 'addTodo' && add.todo.text).toBe('Mutated')
    expect(inverted.type === 'removeTodo' && inverted.todo.text).toBe('Live')
  })
})

describe('createHistory', () => {
  it('undo and redo are no-ops on an empty stack', () => {
    const history = createHistory()
    const start = note({ title: 'Keep' })

    expect(history.undo(start)).toBe(start)
    expect(history.redo(start)).toBe(start)
  })

  it('coalesces consecutive setTitle patches until commit into one undo step', () => {
    const history = createHistory()
    let current = note()

    current = history.push(current, { type: 'setTitle', from: '', to: 'H' })
    current = history.push(current, { type: 'setTitle', from: 'H', to: 'He' })
    current = history.push(current, { type: 'setTitle', from: 'He', to: 'Hello' })
    expect(current.title).toBe('Hello')

    history.commit()
    current = history.undo(current)
    expect(current.title).toBe('')

    current = history.undo(current)
    expect(current.title).toBe('')
  })

  it('coalesces consecutive setTodoText patches of the same field until commit', () => {
    const history = createHistory()
    let current = note({ todos: [todo('t1', '')] })

    current = history.push(current, { type: 'setTodoText', id: 't1', from: '', to: 'M' })
    current = history.push(current, { type: 'setTodoText', id: 't1', from: 'M', to: 'Milk' })
    history.commit()

    current = history.undo(current)
    expect(current.todos[0]?.text).toBe('')
  })

  it('does not coalesce setTodoText of different todos', () => {
    const history = createHistory()
    let current = note({ todos: [todo('t1', ''), todo('t2', '')] })

    current = history.push(current, { type: 'setTodoText', id: 't1', from: '', to: 'One' })
    current = history.push(current, { type: 'setTodoText', id: 't2', from: '', to: 'Two' })

    current = history.undo(current)
    expect(current.todos.map(item => item.text)).toEqual(['One', ''])

    current = history.undo(current)
    expect(current.todos.map(item => item.text)).toEqual(['', ''])
  })

  it('does not coalesce setTitle with setTodoText', () => {
    const history = createHistory()
    let current = note({ todos: [todo('t1', '')] })

    current = history.push(current, { type: 'setTitle', from: '', to: 'List' })
    current = history.push(current, { type: 'setTodoText', id: 't1', from: '', to: 'Item' })

    current = history.undo(current)
    expect(current).toEqual(note({ title: 'List', todos: [todo('t1', '')] }))

    current = history.undo(current)
    expect(current).toEqual(note({ todos: [todo('t1', '')] }))
  })

  it('starts a new text entry after commit of the same field', () => {
    const history = createHistory()
    let current = note()

    current = history.push(current, { type: 'setTitle', from: '', to: 'Hello' })
    history.commit()
    current = history.push(current, { type: 'setTitle', from: 'Hello', to: 'Hello!' })
    history.commit()

    current = history.undo(current)
    expect(current.title).toBe('Hello')

    current = history.undo(current)
    expect(current.title).toBe('')
  })

  it('treats toggle, add, and remove as atomic entries', () => {
    const history = createHistory()
    const first = todo('t1', 'One')
    const second = todo('t2', 'Two')
    let current = note()

    current = history.push(current, { type: 'addTodo', todo: first, index: 0 })
    current = history.push(current, { type: 'addTodo', todo: second, index: 1 })
    current = history.push(current, { type: 'toggleTodo', id: 't1', from: false, to: true })
    current = history.push(current, { type: 'removeTodo', todo: second, index: 1 })

    expect(current.todos).toEqual([{ id: 't1', text: 'One', done: true }])

    current = history.undo(current)
    expect(current.todos).toEqual([
      { id: 't1', text: 'One', done: true },
      second,
    ])

    current = history.undo(current)
    expect(current.todos).toEqual([first, second])

    current = history.undo(current)
    expect(current.todos).toEqual([first])

    current = history.undo(current)
    expect(current.todos).toEqual([])
  })

  it('closes coalesced text when an atomic patch is pushed', () => {
    const history = createHistory()
    let current = note({ todos: [todo('t1')] })

    current = history.push(current, { type: 'setTitle', from: '', to: 'Hi' })
    current = history.push(current, { type: 'toggleTodo', id: 't1', from: false, to: true })

    current = history.undo(current)
    expect(current).toEqual(note({ title: 'Hi', todos: [todo('t1')] }))

    current = history.undo(current)
    expect(current).toEqual(note({ todos: [todo('t1')] }))
  })

  it('redoes inverted add/remove and toggle patches', () => {
    const history = createHistory()
    const item = todo('t1', 'Task')
    let current = note()

    current = history.push(current, { type: 'addTodo', todo: item, index: 0 })
    current = history.push(current, { type: 'toggleTodo', id: 't1', from: false, to: true })
    current = history.push(current, { type: 'removeTodo', todo: { ...item, done: true }, index: 0 })

    current = history.undo(current)
    current = history.undo(current)
    current = history.undo(current)
    expect(current.todos).toEqual([])

    current = history.redo(current)
    expect(current.todos).toEqual([item])

    current = history.redo(current)
    expect(current.todos).toEqual([{ ...item, done: true }])

    current = history.redo(current)
    expect(current.todos).toEqual([])
  })

  it('clears redo when a new patch is pushed after undo', () => {
    const history = createHistory()
    let current = note()

    current = history.push(current, { type: 'setTitle', from: '', to: 'One' })
    history.commit()
    current = history.push(current, { type: 'setTitle', from: 'One', to: 'Two' })
    history.commit()

    current = history.undo(current)
    expect(current.title).toBe('One')

    current = history.push(current, { type: 'setTitle', from: 'One', to: 'Branch' })
    history.commit()

    const afterRedo = history.redo(current)
    expect(afterRedo).toBe(current)
    expect(afterRedo.title).toBe('Branch')

    current = history.undo(current)
    expect(current.title).toBe('One')
    current = history.undo(current)
    expect(current.title).toBe('')
  })

  it(`drops the oldest entry when the stack exceeds ${HISTORY_LIMIT}`, () => {
    const history = createHistory()
    let current = note()

    for (let index = 0; index <= HISTORY_LIMIT; index += 1) {
      const from = index === 0 ? '' : String(index - 1)
      const to = String(index)
      current = history.push(current, { type: 'setTitle', from, to })
      history.commit()
    }

    expect(current.title).toBe(String(HISTORY_LIMIT))

    for (let step = 0; step < HISTORY_LIMIT; step += 1) {
      current = history.undo(current)
    }

    expect(current.title).toBe('0')
    expect(history.undo(current).title).toBe('0')
  })

  it('counts a coalesced text session as a single history entry toward the limit', () => {
    const history = createHistory()
    let current = note()

    current = history.push(current, { type: 'setTitle', from: '', to: 'A' })
    current = history.push(current, { type: 'setTitle', from: 'A', to: 'AB' })
    current = history.push(current, { type: 'setTitle', from: 'AB', to: 'ABC' })
    history.commit()

    for (let index = 0; index < HISTORY_LIMIT - 1; index += 1) {
      current = history.push(current, {
        type: 'addTodo',
        todo: todo(`fill-${index}`),
        index: 0,
      })
    }

    for (let step = 0; step < HISTORY_LIMIT - 1; step += 1) {
      current = history.undo(current)
    }

    expect(current.title).toBe('ABC')
    current = history.undo(current)
    expect(current.title).toBe('')
  })

  it('peekLast returns a copy of the last undo patch without changing the stack', () => {
    const history = createHistory()
    let current = note()

    expect(history.peekLast()).toBeUndefined()

    current = history.push(current, { type: 'setTitle', from: '', to: 'Hi' })
    const last = history.peekLast()
    expect(last).toEqual({ type: 'setTitle', from: '', to: 'Hi' })

    if (last?.type === 'setTitle') {
      last.to = 'Mutated'
    }

    expect(history.peekLast()).toEqual({ type: 'setTitle', from: '', to: 'Hi' })
    expect(history.undo(current).title).toBe('')
  })

  it('clear drops undo and redo so later undo/redo do nothing', () => {
    const history = createHistory()
    let current = note()

    current = history.push(current, { type: 'setTitle', from: '', to: 'Saved' })
    history.commit()
    current = history.undo(current)
    expect(current.title).toBe('')

    history.clear()

    const afterUndo = history.undo(current)
    const afterRedo = history.redo(current)
    expect(afterUndo).toBe(current)
    expect(afterRedo).toBe(current)
    expect(current.title).toBe('')
  })
})
