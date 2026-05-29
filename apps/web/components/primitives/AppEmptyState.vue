<template>
  <section class="app-empty-state">
    <div v-if="$slots.icon" class="app-empty-state__icon" aria-hidden="true">
      <slot name="icon" />
    </div>
    <h2 class="app-empty-state__title">{{ title }}</h2>
    <p v-if="description" class="app-empty-state__description">{{ description }}</p>
    <div v-if="$slots.actions" class="app-empty-state__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<style scoped>
.app-empty-state {
  display: grid;
  justify-items: center;
  gap: var(--dd-space-3);
  border: var(--dd-border-width) dashed var(--dd-color-border-strong);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  padding: var(--dd-space-8) var(--dd-space-5);
  text-align: center;
}

.app-empty-state__icon {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: var(--dd-radius-pill);
  background: var(--dd-color-primary-soft);
  color: var(--dd-color-primary);
}

.app-empty-state__title,
.app-empty-state__description {
  margin: 0;
}

.app-empty-state__title {
  font-size: var(--dd-font-size-lg);
  line-height: var(--dd-line-height-tight);
}

.app-empty-state__description {
  max-width: 34rem;
  color: var(--dd-color-text-muted);
}

.app-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--dd-space-3);
  margin-top: var(--dd-space-2);
}
</style>

