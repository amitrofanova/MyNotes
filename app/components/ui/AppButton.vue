<script setup lang="ts">
defineOptions({ name: 'AppButton' })

withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}>(), {
  variant: 'secondary',
  type: 'button',
  disabled: false,
})
</script>

<template>
  <button
    class="app-button"
    :class="`app-button--${variant}`"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: var(--font-size-md);
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  transition: background-color 0.1s ease, color 0.1s ease, border-color 0.1s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &:focus-visible {
    outline: var(--focus-ring);
    outline-offset: 2px;
  }
}

.app-button--primary {
  background: var(--color-accent);
  color: var(--color-on-accent);

  &:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  &:active:not(:disabled) {
    background: var(--color-accent-pressed);
  }
}

.app-button--secondary {
  background: var(--color-page);
  color: var(--color-text-subtle);

  &:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }
}

.app-button--ghost {
  background: transparent;
  color: var(--color-text-subtle);

  &:hover:not(:disabled) {
    background: var(--color-page);
    color: var(--color-text);
  }
}

.app-button--danger {
  background: var(--color-danger);
  color: var(--color-on-danger);

  &:hover:not(:disabled) {
    background: var(--color-danger-hover);
  }

  &:active:not(:disabled) {
    background: var(--color-danger-pressed);
  }
}
</style>
