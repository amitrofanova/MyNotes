<script setup lang="ts">
defineOptions({ name: 'AppConfirmDialog' })

withDefaults(defineProps<{
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}>(), {
  message: '',
  confirmLabel: 'Подтвердить',
  cancelLabel: 'Отменить',
  danger: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const open = defineModel<boolean>({ default: false })
const messageId = useId()

function onCancel() {
  open.value = false
  emit('cancel')
}

function onConfirm() {
  open.value = false
  emit('confirm')
}
</script>

<template>
  <AppModal
    v-model="open"
    :title="title"
    role="alertdialog"
    :described-by="message ? messageId : undefined"
    :close-on-backdrop="false"
    :show-close="false"
    @close="onCancel"
  >
    <p
      v-if="message"
      :id="messageId"
      class="app-confirm__message"
    >
      {{ message }}
    </p>
    <slot />
    <template #footer>
      <AppButton
        variant="ghost"
        @click="onCancel"
      >
        {{ cancelLabel }}
      </AppButton>
      <AppButton
        :variant="danger ? 'danger' : 'primary'"
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.app-confirm__message {
  margin: 0;
  color: var(--color-text-subtle);
  font-size: var(--font-size-md);
}
</style>
