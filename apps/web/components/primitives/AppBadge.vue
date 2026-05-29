<template>
  <span class="app-badge" :class="`app-badge--${tone}`">
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
  }>(),
  {
    tone: 'neutral',
  },
);
</script>

<style scoped>
.app-badge {
  display: inline-flex;
  min-height: 1.5rem;
  align-items: center;
  border-radius: var(--dd-radius-pill);
  padding: 0 var(--dd-space-2);
  font-size: var(--dd-font-size-xs);
  font-weight: var(--dd-font-weight-semibold);
}

.app-badge--neutral {
  background: var(--dd-color-surface-muted);
  color: var(--dd-color-gray-700);
}

.app-badge--success {
  background: var(--dd-color-primary-soft);
  color: var(--dd-color-green-700);
}

.app-badge--warning {
  background: var(--dd-color-warning-soft);
  color: var(--dd-color-warning);
}

.app-badge--danger {
  background: var(--dd-color-danger-soft);
  color: var(--dd-color-danger);
}
</style>

