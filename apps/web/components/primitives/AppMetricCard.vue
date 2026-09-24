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
  position: relative;
  overflow: hidden;
  border: var(--dd-border-width) solid var(--dd-color-border);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  padding: var(--dd-space-5);
  box-shadow: var(--dd-shadow-sm);
}
.app-metric-card::after { content: ''; position: absolute; right: -0.8rem; top: -0.8rem; width: 3rem; height: 3rem; border-radius: 50%; background: var(--dd-color-primary-soft); opacity: var(--dd-decoration-opacity); pointer-events: none; }
.app-metric-card:nth-child(2)::after { background: var(--dd-color-lilac); }
.app-metric-card:nth-child(3)::after { background: var(--dd-color-success-soft); }
.app-metric-card:nth-child(4)::after { background: var(--dd-color-peach); }

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
  font-family: var(--dd-font-display);
  font-variant-numeric: tabular-nums;
  font-size: 2.6rem;
  letter-spacing: -0.06em;
  font-weight: var(--dd-font-weight-bold);
  line-height: var(--dd-line-height-tight);
}

.app-metric-card__detail {
  margin-top: var(--dd-space-2);
  color: var(--dd-color-text-muted);
  font-size: var(--dd-font-size-sm);
}
</style>
