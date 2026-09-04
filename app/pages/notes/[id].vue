<script setup lang="ts">
import { NEW_NOTE_ID } from '../../composables/useNoteEditor'
import { noteDisplayTitle } from '../../utils/noteTitle'
import { STORAGE_KEY, migrate } from '../../utils/storage'

definePageMeta({
  key: 'note-editor',
})

const route = useRoute()
const notes = useNotesStore()

const routeId = computed(() => {
  const raw = route.params.id
  if (Array.isArray(raw)) {
    return raw[0] ?? ''
  }
  return raw ?? ''
})

const {
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
} = useNoteEditor(routeId)

const { handleKeydown } = useEditorHotkeys({
  undo,
  redo,
  hasUncommittedText: () => hasUncommittedText.value,
})

const titleInputId = useId()
const draftOpen = ref(false)
const cancelOpen = ref(false)
const deleteOpen = ref(false)
const removedOpen = ref(false)

const anyDialogOpen = computed(() => {
  return draftOpen.value || cancelOpen.value || deleteOpen.value || removedOpen.value
})

const displayTitle = computed(() => noteDisplayTitle(note.value?.title ?? ''))

const canSave = computed(() => {
  const current = note.value
  if (status.value !== 'ready' || current === null) {
    return false
  }

  return isDirty.value || notes.getById(current.id) === undefined
})

const pageTitle = computed(() => {
  if (status.value === 'missing') {
    return 'Заметка не найдена'
  }

  return displayTitle.value
})

useHead({
  title: pageTitle,
})

watch(
  () => note.value?.id,
  (id) => {
    if (id && routeId.value === NEW_NOTE_ID) {
      void navigateTo(`/notes/${id}`, { replace: true })
    }
  },
  { immediate: true },
)

watch(
  () => [status.value, note.value?.id] as const,
  (current, previous) => {
    if (previous && current[0] === previous[0] && current[1] === previous[1]) {
      return
    }

    draftOpen.value = status.value === 'ready' && hasDraft.value
  },
  { immediate: true },
)

function onTitleInput(event: Event) {
  const target = event.target
  if (target instanceof HTMLInputElement) {
    setTitle(target.value)
  }
}

function onRestoreDraft() {
  restoreDraft()
  draftOpen.value = false
}

function onDiscardDraft() {
  discardDraft()
  draftOpen.value = false
}

function requestLeave() {
  if (isDirty.value) {
    cancelOpen.value = true
    return
  }

  leaveEditor()
}

function leaveEditor() {
  cancel()
  return navigateTo('/')
}

function requestDelete() {
  deleteOpen.value = true
}

function confirmDelete() {
  const id = note.value?.id
  cancel()
  if (id) {
    notes.remove(id)
  }
  return navigateTo('/')
}

function noteIdsFromStorageValue(raw: string | null): Set<string> {
  if (raw === null || raw === '') {
    return new Set()
  }

  try {
    return new Set(migrate(JSON.parse(raw)).notes.map(item => item.id))
  }
  catch {
    return new Set()
  }
}

function handleRemoteRemoval() {
  closeLocalDialogs()
  removedOpen.value = true
  notes.syncFromStorage()
}

function closeLocalDialogs() {
  draftOpen.value = false
  cancelOpen.value = false
  deleteOpen.value = false
}

function onStorage(event: StorageEvent) {
  const current = note.value
  if (status.value !== 'ready' || current === null) {
    return
  }

  if (event.key === null) {
    if (notes.getById(current.id) !== undefined) {
      handleRemoteRemoval()
    }
    return
  }

  if (event.key !== STORAGE_KEY) {
    return
  }

  const oldIds = noteIdsFromStorageValue(event.oldValue)
  const newIds = noteIdsFromStorageValue(event.newValue)
  if (oldIds.has(current.id) && !newIds.has(current.id)) {
    handleRemoteRemoval()
  }
}

function acknowledgeRemoteDelete() {
  cancel()
  notes.syncFromStorage()
  removedOpen.value = false
  return navigateTo('/')
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (anyDialogOpen.value || status.value !== 'ready') {
    return
  }

  handleKeydown(event)
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('storage', onStorage)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('storage', onStorage)
})
</script>

<template>
  <main
    v-if="status === 'missing'"
    class="note-page"
  >
    <NoteMissing />
  </main>
  <main
    v-else-if="note"
    class="note-page"
  >
    <header class="note-page__header">
      <div class="note-page__heading">
        <AppButton
          variant="ghost"
          @click="requestLeave"
        >
          К списку
        </AppButton>
        <h1 class="note-page__title">
          Заметка
        </h1>
      </div>
      <div class="note-page__actions">
        <AppButton
          variant="primary"
          :disabled="!canSave"
          @click="save"
        >
          Сохранить
        </AppButton>
        <AppButton
          variant="secondary"
          @click="requestLeave"
        >
          Отменить
        </AppButton>
        <AppButton
          variant="danger"
          @click="requestDelete"
        >
          Удалить
        </AppButton>
      </div>
    </header>

    <div class="note-page__editor">
      <div class="note-page__title-field">
        <label
          class="sr-only"
          :for="titleInputId"
        >
          Название заметки
        </label>
        <input
          :id="titleInputId"
          class="note-page__title-input"
          type="text"
          :value="note.title"
          placeholder="Название"
          autocomplete="off"
          @input="onTitleInput"
          @blur="commitText"
          @keydown.enter.prevent
        >
      </div>

      <NoteTodoList
        :key="note.id"
        :todos="note.todos"
        @toggle="toggleTodo"
        @update-text="setTodoText"
        @blur="blurTodo"
        @remove="removeTodo"
        @add="addTodo"
      />
    </div>

    <AppModal
      v-model="draftOpen"
      title="Восстановить черновик?"
      role="alertdialog"
      :close-on-backdrop="false"
      :close-on-escape="false"
      :show-close="false"
    >
      <p>Есть несохранённые изменения с прошлого сеанса.</p>
      <template #footer>
        <AppButton
          variant="ghost"
          @click="onDiscardDraft"
        >
          Отбросить
        </AppButton>
        <AppButton
          variant="primary"
          @click="onRestoreDraft"
        >
          Восстановить
        </AppButton>
      </template>
    </AppModal>

    <AppConfirmDialog
      v-model="cancelOpen"
      title="Отменить изменения?"
      message="Несохранённые правки будут сброшены."
      confirm-label="Отменить правки"
      cancel-label="Продолжить"
      @confirm="leaveEditor"
    />

    <AppConfirmDialog
      v-model="deleteOpen"
      title="Удалить заметку?"
      :message="`Заметка «${displayTitle}» будет удалена без возможности отмены.`"
      confirm-label="Удалить"
      cancel-label="Отменить"
      danger
      @confirm="confirmDelete"
    />

    <AppModal
      v-model="removedOpen"
      title="Заметка удалена"
      role="alertdialog"
      :close-on-backdrop="false"
      :close-on-escape="false"
      :show-close="false"
    >
      <p>Эту заметку удалили в другой вкладке.</p>
      <template #footer>
        <AppButton
          variant="primary"
          @click="acknowledgeRemoteDelete"
        >
          К списку
        </AppButton>
      </template>
    </AppModal>
  </main>
</template>

<style scoped lang="scss">
.note-page {
  width: min(100%, 40rem);
  margin-inline: auto;
}

.note-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.note-page__heading {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

.note-page__title {
  margin: 0;
}

.note-page__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}

.note-page__editor {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.note-page__title-input {
  width: 100%;
  padding: 0.35rem 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--color-field-border);
  border-radius: 0;
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: 600;
  line-height: var(--line-height-heading);

  &:focus-visible {
    outline: none;
    border-bottom-color: var(--color-accent);
    box-shadow: 0 2px 0 0 var(--color-accent);
  }
}
</style>
