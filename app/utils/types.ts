export interface Todo {
  id: string
  text: string
  done: boolean
}

export interface Note {
  id: string
  title: string
  todos: Todo[]
}

export interface PersistedState {
  schemaVersion: number
  notes: Note[]
}
