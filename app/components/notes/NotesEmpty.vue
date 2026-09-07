<script setup lang="ts">
defineOptions({ name: 'NotesEmpty' })

const emit = defineEmits<{
  create: []
}>()
</script>

<template>
  <div class="notes-empty">
    <span
      class="notes-empty__mark"
      aria-hidden="true"
    >
      <svg
        class="notes-empty__icon"
        viewBox="0 0 24 24"
        fill="none"
      >
        <rect
          x="5"
          y="3"
          width="14"
          height="18"
          rx="2"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M8 8h8M8 12h8M8 16h5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </span>
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.notes-empty__mark {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: var(--space-1);
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface));
  border-radius: 50%;
}

.notes-empty__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.notes-empty__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.notes-empty__text {
  margin: 0 0 var(--space-2);
  max-width: 28rem;
  color: var(--color-text-subtle);
  font-size: var(--font-size-md);
}
</style>
