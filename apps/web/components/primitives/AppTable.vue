<template>
  <div class="app-table" role="region" :aria-label="label" tabindex="0">
    <table>
      <slot />
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<style scoped>
.app-table {
  width: 100%;
  overflow-x: auto;
  border: var(--dd-border-width) solid var(--dd-color-border);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
}

.app-table table {
  width: 100%;
  min-width: 36rem;
  border-collapse: collapse;
}

.app-table :deep(th),
.app-table :deep(td) {
  border-bottom: var(--dd-border-width) solid var(--dd-color-border);
  padding: var(--dd-space-3) var(--dd-space-4);
  text-align: left;
  vertical-align: top;
}

.app-table :deep(th) {
  background: var(--dd-color-surface-muted);
  color: var(--dd-color-gray-700);
  font-size: var(--dd-font-size-sm);
  font-weight: var(--dd-font-weight-semibold);
}

.app-table :deep(tr:last-child td) {
  border-bottom: 0;
}
</style>

