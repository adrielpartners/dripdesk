<template>
  <section class="app-card">
    <header v-if="$slots.header || title" class="app-card__header">
      <slot name="header">
        <h2 class="app-card__title">{{ title }}</h2>
      </slot>
    </header>
    <div class="app-card__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<style scoped>
.app-card {
  border: var(--dd-border-width) solid var(--dd-color-border);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  box-shadow: var(--dd-shadow-sm);
}

.app-card__header {
  border-bottom: var(--dd-border-width) solid var(--dd-color-border);
  padding: var(--dd-space-4) var(--dd-space-5);
}

.app-card__title {
  margin: 0;
  font-size: var(--dd-font-size-lg);
  line-height: var(--dd-line-height-tight);
}

.app-card__body {
  padding: var(--dd-space-5);
}
</style>

