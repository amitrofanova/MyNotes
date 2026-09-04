<script setup lang="ts">
defineOptions({ name: 'NotesEmpty' })

const emit = defineEmits<{
  create: []
}>()
</script>

<template>
  <div class="notes-empty">
    <h2 class="notes-empty__title">
      Пока нет заметок
    </h2>
    <p class="notes-empty__text">
      Создайте первую — на главной появятся заголовок и превью списка дел.
    </p>
    <AppButton
      variant="primary"
      @click="emit('create')"
    >
      Создать заметку
    </AppButton>
  </div>
</template>

<style scoped lang="scss">
.notes-empty {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-5);
  text-align: center;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.notes-empty__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.notes-empty__text {
  margin: 0;
  max-width: 28rem;
  color: var(--color-text-subtle);
  font-size: var(--font-size-md);
}
</style>
