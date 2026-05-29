<template>
  <section class="app-metric-card">
    <p class="app-metric-card__label">{{ label }}</p>
    <p class="app-metric-card__value">{{ value }}</p>
    <p v-if="detail" class="app-metric-card__detail">{{ detail }}</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  detail?: string;
}>();
</script>

<style scoped>
.app-metric-card {
  border: var(--dd-border-width) solid var(--dd-color-border);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  padding: var(--dd-space-5);
  box-shadow: var(--dd-shadow-sm);
}

.app-metric-card__label,
.app-metric-card__value,
.app-metric-card__detail {
  margin: 0;
}

.app-metric-card__label {
  color: var(--dd-color-text-muted);
  font-size: var(--dd-font-size-sm);
  font-weight: var(--dd-font-weight-medium);
}

.app-metric-card__value {
  margin-top: var(--dd-space-2);
  font-size: var(--dd-font-size-2xl);
  font-weight: var(--dd-font-weight-bold);
  line-height: var(--dd-line-height-tight);
}

.app-metric-card__detail {
  margin-top: var(--dd-space-2);
  color: var(--dd-color-text-muted);
  font-size: var(--dd-font-size-sm);
}
</style>

