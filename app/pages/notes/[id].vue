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

const addFieldUncommitted = ref(false)

const { handleKeydown } = useEditorHotkeys({
  undo,
  redo,
  hasUncommittedText: () => hasUncommittedText.value || addFieldUncommitted.value,
})

const titleInputId = useId()
const titleInput = useTemplateRef<HTMLTextAreaElement>('titleInput')
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

const titleFieldWidth = ref(0)

function resizeTitleInput() {
  const el = titleInput.value
  if (!el) {
    return
  }

  if (typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')) {
    el.style.height = ''
    return
  }

  el.style.height = '0px'
  el.style.height = `${el.scrollHeight}px`
}

function onTitleInput(event: Event) {
  const target = event.target
  if (target instanceof HTMLTextAreaElement) {
    setTitle(target.value)
    resizeTitleInput()
  }
}

watch(
  () => [note.value?.title, titleInput.value, titleFieldWidth.value] as const,
  async () => {
    await nextTick()
    resizeTitleInput()
  },
  { flush: 'post', immediate: true },
)

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

let titleWidthObserver: ResizeObserver | null = null

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('storage', onStorage)
})

watch(titleInput, (el) => {
  titleWidthObserver?.disconnect()
  titleWidthObserver = null

  if (!el) {
    return
  }

  titleWidthObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width ?? 0
    if (width > 0 && width !== titleFieldWidth.value) {
      titleFieldWidth.value = width
    }
  })
  titleWidthObserver.observe(el)
}, { flush: 'post', immediate: true })

onUnmounted(() => {
  titleWidthObserver?.disconnect()
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
    class="note-page note-page--edit"
  >
    <header class="note-page__header">
      <div class="note-page__heading">
        <AppButton
          variant="ghost"
          @click="requestLeave"
        >
          К списку
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
        <textarea
          :id="titleInputId"
          ref="titleInput"
          class="note-page__title-input"
          rows="1"
          :value="note.title"
          placeholder="Название"
          autocomplete="off"
          @input="onTitleInput"
          @blur="commitText"
          @keydown.enter.prevent
        />
      </div>

      <NoteTodoList
        :key="note.id"
        :todos="note.todos"
        @toggle="toggleTodo"
        @update-text="setTodoText"
        @blur="blurTodo"
        @remove="removeTodo"
        @add="addTodo"
        @uncommitted-add="addFieldUncommitted = $event"
      />
    </div>

    <footer
      class="note-page__actions"
      aria-label="Действия с заметкой"
    >
      <AppButton
        class="note-page__action"
        variant="secondary"
        @click="requestLeave"
      >
        Отменить
      </AppButton>
      <AppButton
        class="note-page__action"
        variant="danger"
        @click="requestDelete"
      >
        Удалить
      </AppButton>
      <AppButton
        class="note-page__action"
        variant="primary"
        :disabled="!canSave"
        @click="save"
      >
        Сохранить
      </AppButton>
    </footer>

    <AppModal
      v-model="draftOpen"
      title="Восстановить черновик?"
      role="alertdialog"
      :close-on-backdrop="false"
      :show-close="false"
      @close="onDiscardDraft"
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
      :show-close="false"
      @close="acknowledgeRemoteDelete"
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

.note-page--edit {
  padding-bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));

  @media (max-width: 47.9875rem) {
    width: calc(100% + 2 * var(--space-5));
    margin-inline: calc(-1 * var(--space-5));
    padding-inline: var(--space-4);
  }
}

.note-page__header {
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
  position: fixed;
  z-index: 10;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.note-page__action {
  flex: 1 1 0;
  min-width: 0;
  padding-inline: 0.5rem;
}

.note-page__editor {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.note-page__title-input {
  display: block;
  box-sizing: content-box;
  width: 100%;
  min-width: 0;
  min-height: calc(var(--font-size-xl) * var(--line-height-heading));
  padding: 0.35rem 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--color-field-border);
  border-radius: 0;
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: 600;
  line-height: var(--line-height-heading);
  field-sizing: content;
  resize: none;
  overflow: hidden;
  overflow-wrap: anywhere;

  &:focus-visible {
    outline: none;
    border-bottom-color: var(--color-accent);
    box-shadow: 0 2px 0 0 var(--color-accent);
  }
}

@media (min-width: 48rem) {
  .note-page--edit {
    padding-bottom: 0;
  }

  .note-page__editor {
    padding: var(--space-5);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .note-page__actions {
    position: static;
    inset: auto;
    z-index: auto;
    justify-content: flex-end;
    margin-top: var(--space-4);
    padding: 0;
    background: transparent;
    border: 0;
  }

  .note-page__action {
    flex: 0 0 auto;
    padding-inline: 0.75rem;
  }
}
</style>
