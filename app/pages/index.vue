<script setup lang="ts">
import { noteDisplayTitle } from '../utils/noteTitle'

const notes = useNotesStore()

const confirmOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)

const pendingDeleteTitle = computed(() => {
  if (pendingDeleteId.value === null) {
    return noteDisplayTitle('')
  }

  const note = notes.getById(pendingDeleteId.value)
  return noteDisplayTitle(note?.title ?? '')
})

function goCreate() {
  return navigateTo('/notes/new')
}

function goEdit(id: string) {
  return navigateTo(`/notes/${id}`)
}

function requestDelete(id: string) {
  pendingDeleteId.value = id
  confirmOpen.value = true
}

function confirmDelete() {
  const id = pendingDeleteId.value
  pendingDeleteId.value = null

  if (id) {
    notes.remove(id)
  }
}

function cancelDelete() {
  pendingDeleteId.value = null
}
</script>

<template>
  <main class="notes-home">
    <header class="notes-home__header">
      <h1 class="notes-home__title">
        Заметки
      </h1>
      <AppButton
        variant="primary"
        @click="goCreate"
      >
        Создать
      </AppButton>
    </header>

    <NotesEmpty
      v-if="notes.list.length === 0"
      @create="goCreate"
    />
    <ul
      v-else
      class="notes-home__grid"
    >
      <li
        v-for="note in notes.list"
        :key="note.id"
      >
        <NoteCard
          :note="note"
          @edit="goEdit(note.id)"
          @delete="requestDelete(note.id)"
        />
      </li>
    </ul>

    <AppConfirmDialog
      v-model="confirmOpen"
      title="Удалить заметку?"
      :message="`Заметка «${pendingDeleteTitle}» будет удалена без возможности отмены.`"
      confirm-label="Удалить"
      cancel-label="Отменить"
      danger
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </main>
</template>

<style scoped lang="scss">
.notes-home {
  width: min(100%, 64rem);
  margin-inline: auto;
}

.notes-home__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.notes-home__title {
  margin: 0;
}

.notes-home__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;

  @media (min-width: 48rem) {
    grid-template-columns: repeat(auto-fill, minmax(16.5rem, 1fr));
  }
}

.notes-home__grid > li {
  display: flex;
  min-width: 0;
}
</style>
