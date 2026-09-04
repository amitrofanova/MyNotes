<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: 'ru',
  },
  title: 'MyNotes',
})
</script>

<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style scoped lang="scss">
.app {
  min-height: 100vh;
  padding: var(--space-6) var(--space-5) var(--space-8);
}
</style>
