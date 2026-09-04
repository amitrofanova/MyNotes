<script setup lang="ts">
defineOptions({ name: 'NoteMissing' })
</script>

<template>
  <div class="note-missing">
    <h1 class="note-missing__title">
      Заметка не найдена
    </h1>
    <p class="note-missing__text">
      Такой заметки нет — её удалили или ссылка устарела.
    </p>
    <NuxtLink
      to="/"
      class="note-missing__link"
    >
      На главную
    </NuxtLink>
  </div>
</template>

<style scoped lang="scss">
.note-missing {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-5);
  text-align: center;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.note-missing__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.note-missing__text {
  margin: 0;
  max-width: 28rem;
  color: var(--color-text-subtle);
  font-size: var(--font-size-md);
}

.note-missing__link {
  color: var(--color-accent);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 0.15em;

  &:hover {
    color: var(--color-accent-hover);
  }
}
</style>
