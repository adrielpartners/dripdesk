<template>
  <button class="app-button" :class="classes" :type="type" :disabled="disabled">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
  },
);

const classes = computed(() => [`app-button--${props.variant}`, `app-button--${props.size}`]);
</script>

<style scoped>
.app-button {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  gap: var(--dd-space-2);
  border: var(--dd-border-width) solid transparent;
  border-radius: var(--dd-radius-md);
  font-weight: var(--dd-font-weight-semibold);
  line-height: var(--dd-line-height-tight);
  text-align: center;
  transition:
    transform var(--dd-duration-fast) var(--dd-ease-standard),
    box-shadow var(--dd-duration-fast) var(--dd-ease-standard),
    background-color var(--dd-duration-fast) var(--dd-ease-standard),
    border-color var(--dd-duration-fast) var(--dd-ease-standard),
    color var(--dd-duration-fast) var(--dd-ease-standard);
}

.app-button:disabled {
  opacity: 0.56;
}

.app-button--sm {
  min-height: 2rem;
  padding: 0 var(--dd-space-3);
  font-size: var(--dd-font-size-sm);
}

.app-button--md {
  padding: 0 var(--dd-space-4);
  font-size: var(--dd-font-size-sm);
}

.app-button--lg {
  min-height: 3rem;
  padding: 0 var(--dd-space-5);
  font-size: var(--dd-font-size-md);
}

.app-button--primary {
  background: var(--dd-color-primary);
  color: var(--dd-color-on-primary);
  border-color: var(--dd-control-border);
  box-shadow: var(--dd-shadow-button);
}

.app-button--primary:hover:not(:disabled) {
  background: var(--dd-color-primary-hover);
  transform: translateY(var(--dd-hover-lift));
}
.app-button--primary:active:not(:disabled) { transform: translateY(1px); box-shadow: none; }

.app-button--secondary {
  border-color: var(--dd-color-border-strong);
  background: var(--dd-color-secondary);
  color: var(--dd-color-on-secondary);
}

.app-button--secondary:hover:not(:disabled) {
  background: var(--dd-color-secondary-hover);
}

.app-button--ghost {
  border-color: var(--dd-color-border);
  background: var(--dd-color-surface);
  color: var(--dd-color-text);
}

.app-button--ghost:hover:not(:disabled) {
  background: var(--dd-color-surface-muted);
}

.app-button--danger {
  background: var(--dd-color-danger);
  color: var(--dd-color-white);
}
</style>
