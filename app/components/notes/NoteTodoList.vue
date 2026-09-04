<script setup lang="ts">
import type { Todo } from '../../utils/types'

defineOptions({ name: 'NoteTodoList' })

defineProps<{
  todos: Todo[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
  updateText: [id: string, text: string]
  blur: [id: string]
  remove: [id: string]
  add: [text: string]
}>()

const newTodoText = ref('')
const addInputId = useId()

const canAdd = computed(() => newTodoText.value.trim().length > 0)

function onTextInput(event: Event, id: string) {
  const target = event.target
  if (target instanceof HTMLInputElement) {
    emit('updateText', id, target.value)
  }
}

function submitNewTodo() {
  const text = newTodoText.value.trim()
  if (text.length === 0) {
    return
  }

  emit('add', text)
  newTodoText.value = ''
}
</script>

<template>
  <section
    class="note-todos"
    aria-label="Список дел"
  >
    <ul
      v-if="todos.length > 0"
      class="note-todos__list"
    >
      <li
        v-for="todo in todos"
        :key="todo.id"
        class="note-todos__item"
      >
        <label class="note-todos__check">
          <input
            type="checkbox"
            class="note-todos__checkbox"
            :checked="todo.done"
            :aria-label="todo.text.trim() ? `Выполнено: ${todo.text}` : 'Выполнено'"
            @change="emit('toggle', todo.id)"
          >
        </label>
        <input
          class="note-todos__text"
          :class="{ 'note-todos__text--done': todo.done }"
          type="text"
          :value="todo.text"
          aria-label="Текст пункта"
          autocomplete="off"
          @input="onTextInput($event, todo.id)"
          @blur="emit('blur', todo.id)"
          @keydown.enter.prevent="emit('blur', todo.id)"
        >
        <AppButton
          class="note-todos__remove"
          variant="ghost"
          aria-label="Удалить пункт"
          @click="emit('remove', todo.id)"
        >
          Удалить
        </AppButton>
      </li>
    </ul>
    <p
      v-else
      class="note-todos__empty"
    >
      Пунктов пока нет
    </p>

    <form
      class="note-todos__add"
      @submit.prevent="submitNewTodo"
    >
      <label
        class="sr-only"
        :for="addInputId"
      >
        Новый пункт
      </label>
      <input
        :id="addInputId"
        v-model="newTodoText"
        class="note-todos__new"
        type="text"
        placeholder="Новый пункт"
        autocomplete="off"
      >
      <AppButton
        variant="secondary"
        type="submit"
        :disabled="!canAdd"
      >
        Добавить
      </AppButton>
    </form>
  </section>
</template>

<style scoped lang="scss">
.note-todos {
  display: grid;
  gap: var(--space-4);
}

.note-todos__list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.note-todos__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.note-todos__check {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.note-todos__checkbox {
  width: 1rem;
  height: 1rem;
  margin: 0;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.note-todos__text,
.note-todos__new {
  width: 100%;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  background: var(--color-field-bg);
  border: 1px solid var(--color-field-border);
  border-radius: var(--radius-sm);

  &:focus-visible {
    outline: var(--focus-ring);
    outline-offset: 2px;
    border-color: var(--color-focus);
  }
}

.note-todos__text--done {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.note-todos__remove {
  flex-shrink: 0;
}

.note-todos__empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.note-todos__add {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--space-2);
}

.note-todos__new {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
