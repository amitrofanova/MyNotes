<script setup lang="ts">
import { noteDisplayTitle } from '../../utils/noteTitle'
import type { Note } from '../../utils/types'

defineOptions({ name: 'NoteCard' })

const PREVIEW_LIMIT = 3

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const titleId = useId()
const displayTitle = computed(() => noteDisplayTitle(props.note.title))
const previewTodos = computed(() => props.note.todos.slice(0, PREVIEW_LIMIT))
const extraCount = computed(() => Math.max(0, props.note.todos.length - PREVIEW_LIMIT))
</script>

<template>
  <article
    class="note-card"
    :aria-labelledby="titleId"
  >
    <h2
      :id="titleId"
      class="note-card__title"
    >
      {{ displayTitle }}
    </h2>

    <ul
      v-if="previewTodos.length > 0"
      class="note-card__todos"
    >
      <li
        v-for="todo in previewTodos"
        :key="todo.id"
        class="note-card__todo"
      >
        <span
          class="note-card__check"
          :class="{ 'note-card__check--done': todo.done }"
          aria-hidden="true"
        />
        <span
          class="note-card__text"
          :class="{ 'note-card__text--done': todo.done }"
        >
          {{ todo.text }}
        </span>
        <span class="sr-only">
          {{ todo.done ? 'выполнено' : 'не выполнено' }}
        </span>
      </li>
    </ul>
    <p
      v-else
      class="note-card__empty-todos"
    >
      Пунктов пока нет
    </p>

    <p
      v-if="extraCount > 0"
      class="note-card__more"
    >
      Ещё {{ extraCount }}…
    </p>

    <div class="note-card__actions">
      <AppButton
        variant="secondary"
        @click="emit('edit')"
      >
        Изменить
      </AppButton>
      <AppButton
        variant="ghost"
        @click="emit('delete')"
      >
        Удалить
      </AppButton>
    </div>
  </article>
</template>

<style scoped lang="scss">
.note-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.note-card__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.note-card__todos {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.note-card__todo {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 0;
}

.note-card__check {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 0.875rem;
  height: 0.875rem;
  margin-top: 0.2rem;
  border: 2px solid var(--color-text-muted);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  pointer-events: none;
}

.note-card__check--done {
  border-color: var(--color-accent);
  background: var(--color-accent);
}

.note-card__check--done::after {
  content: '';
  width: 0.2rem;
  height: 0.375rem;
  margin-bottom: 0.125rem;
  border: solid var(--color-on-accent);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.note-card__text {
  min-width: 0;
  color: var(--color-text-subtle);
  font-size: var(--font-size-md);
  overflow-wrap: anywhere;
}

.note-card__text--done {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.note-card__empty-todos,
.note-card__more {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.note-card__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
</style>
