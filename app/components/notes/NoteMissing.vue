<script setup lang="ts">
defineOptions({ name: 'NoteMissing' })
</script>

<template>
  <div class="note-missing">
    <span
      class="note-missing__mark"
      aria-hidden="true"
    >
      <svg
        class="note-missing__icon"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M7 3.75h7.5L19 8.25v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path
          d="M14.5 3.75V8h4.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path
          d="M9.5 13.5 14.5 18.5M14.5 13.5 9.5 18.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </span>
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
  border: 1px solid color-mix(in srgb, var(--color-danger) 22%, var(--color-border));
  border-radius: var(--radius-md);
}

.note-missing__mark {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: var(--space-1);
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, var(--color-surface));
  border-radius: 50%;
}

.note-missing__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.note-missing__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.note-missing__text {
  margin: 0 0 var(--space-2);
  max-width: 28rem;
  color: var(--color-text-subtle);
  font-size: var(--font-size-md);
}

.note-missing__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    background: var(--color-accent-hover);
    color: var(--color-on-accent);
  }

  &:focus-visible {
    outline: var(--focus-ring);
    outline-offset: 2px;
  }
}
</style>
