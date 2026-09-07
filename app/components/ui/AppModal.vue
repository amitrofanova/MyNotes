<script setup lang="ts">
import {
  getFocusableElements,
  handleFocusTrapKeydown,
  lockBodyScroll,
  setAppInert,
  unlockBodyScroll,
} from './modalA11y'

defineOptions({ name: 'AppModal' })

const props = withDefaults(defineProps<{
  title?: string
  ariaLabel?: string
  describedBy?: string
  role?: 'dialog' | 'alertdialog'
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  showClose?: boolean
}>(), {
  title: undefined,
  ariaLabel: undefined,
  describedBy: undefined,
  role: 'dialog',
  closeOnEscape: true,
  closeOnBackdrop: true,
  showClose: true,
})

const emit = defineEmits<{
  close: []
}>()

const open = defineModel<boolean>({ default: false })

const slots = useSlots()
const panelRef = useTemplateRef<HTMLElement>('panelRef')
const titleId = useId()
const labelledBy = computed(() => (props.title || slots.title ? titleId : undefined))
const label = computed(() => (labelledBy.value ? undefined : props.ariaLabel))

let previousFocus: HTMLElement | null = null
let sessionActive = false
let pointerOnBackdrop = false

function requestClose() {
  if (!open.value) {
    return
  }

  open.value = false
  emit('close')
}

function isBackdropEvent(event: MouseEvent) {
  return event.target === event.currentTarget
}

function onBackdropPointerDown(event: MouseEvent) {
  pointerOnBackdrop = isBackdropEvent(event)
}

function onBackdropPointerUp(event: MouseEvent) {
  if (props.closeOnBackdrop && pointerOnBackdrop && isBackdropEvent(event)) {
    requestClose()
  }
  pointerOnBackdrop = false
}

function onDocumentKeydown(event: KeyboardEvent) {
  const panel = panelRef.value
  if (!open.value || !panel) {
    return
  }

  if (event.key === 'Escape') {
    if (props.closeOnEscape) {
      event.preventDefault()
      event.stopPropagation()
      requestClose()
    }
    return
  }

  handleFocusTrapKeydown(event, panel)
}

function onDocumentFocusIn(event: FocusEvent) {
  const panel = panelRef.value
  const target = event.target
  if (!open.value || !panel || !(target instanceof Node)) {
    return
  }

  if (!panel.contains(target)) {
    panel.focus({ preventScroll: true })
  }
}

function bindDocument() {
  document.addEventListener('keydown', onDocumentKeydown, true)
  document.addEventListener('focusin', onDocumentFocusIn, true)
}

function unbindDocument() {
  document.removeEventListener('keydown', onDocumentKeydown, true)
  document.removeEventListener('focusin', onDocumentFocusIn, true)
}

function activateSession() {
  if (sessionActive || typeof document === 'undefined') {
    return
  }

  sessionActive = true
  previousFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
  lockBodyScroll()
  setAppInert(true)
  bindDocument()
}

function deactivateSession() {
  if (!sessionActive) {
    return
  }

  sessionActive = false
  unbindDocument()
  unlockBodyScroll()
  setAppInert(false)
  previousFocus?.focus({ preventScroll: true })
  previousFocus = null
}

watch(open, async (isOpen) => {
  if (import.meta.server) {
    return
  }

  if (isOpen) {
    activateSession()
    await nextTick()
    const panel = panelRef.value
    if (!panel) {
      return
    }

    const focusable = getFocusableElements(panel)
    const initial = focusable[0]
    if (initial) {
      initial.focus({ preventScroll: true })
    }
    else {
      panel.focus({ preventScroll: true })
    }
    return
  }

  deactivateSession()
}, { immediate: true, flush: 'post' })

onUnmounted(() => {
  deactivateSession()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div
        v-if="open"
        class="app-modal"
        @mousedown="onBackdropPointerDown"
        @mouseup="onBackdropPointerUp"
      >
        <div
          ref="panelRef"
          class="app-modal__panel"
          :role="role"
          aria-modal="true"
          :aria-labelledby="labelledBy"
          :aria-label="label"
          :aria-describedby="describedBy"
          tabindex="-1"
        >
          <div
            v-if="title || showClose || $slots.title"
            class="app-modal__header"
          >
            <h2
              v-if="title"
              :id="titleId"
              class="app-modal__title"
            >
              {{ title }}
            </h2>
            <div
              v-else-if="$slots.title"
              :id="titleId"
              class="app-modal__title"
            >
              <slot name="title" />
            </div>
            <AppButton
              v-if="showClose"
              class="app-modal__close"
              variant="ghost"
              aria-label="Закрыть"
              @click="requestClose"
            >
              <span aria-hidden="true">×</span>
            </AppButton>
          </div>
          <div class="app-modal__body">
            <slot />
          </div>
          <div
            v-if="$slots.footer"
            class="app-modal__footer"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.app-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--color-overlay);
}

.app-modal__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: min(100%, 25rem);
  max-height: min(90vh, 40rem);
  overflow: auto;
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-elevated);
  overscroll-behavior: contain;
}

.app-modal__header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.app-modal__title {
  flex: 1;
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: 500;
  line-height: var(--line-height-heading);
  color: var(--color-text);
}

.app-modal__close {
  flex-shrink: 0;
  margin-left: auto;
  width: 2rem;
  min-height: 2rem;
  padding: 0;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--color-text-muted);
}

.app-modal__body {
  color: var(--color-text-subtle);
  font-size: var(--font-size-md);
}

.app-modal__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}

.app-modal-enter-active,
.app-modal-leave-active {
  transition: opacity 0.18s ease;
}

.app-modal-leave-active {
  pointer-events: none;
}

.app-modal-enter-active .app-modal__panel,
.app-modal-leave-active .app-modal__panel {
  transition: transform 0.18s ease;
}

.app-modal-enter-from,
.app-modal-leave-to {
  opacity: 0;
}

.app-modal-enter-from .app-modal__panel,
.app-modal-leave-to .app-modal__panel {
  transform: translateY(0.5rem);
}
</style>
