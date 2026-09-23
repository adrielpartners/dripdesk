<template>
  <div class="copyable-text">
    <span v-if="label" class="copyable-text__label">{{ label }}</span>
    <div class="copyable-text__row">
      <code class="copyable-text__value">{{ value }}</code>
      <AppButton type="button" variant="ghost" size="sm" :aria-label="`Copy ${copyLabel}`" @click="copy">
        {{ copied ? 'Copied' : 'Copy' }}
      </AppButton>
    </div>
    <span v-if="copyError" class="copyable-text__error" role="alert">{{ copyError }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ value: string; label?: string; copyLabel: string }>();
const copied = ref(false);
const copyError = ref('');

async function copy() {
  try {
    await navigator.clipboard.writeText(props.value);
    copied.value = true;
    copyError.value = '';
    window.setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    copyError.value = 'Could not copy automatically. Select and copy the text instead.';
  }
}
</script>

<style scoped>
.copyable-text {
  display: grid;
  gap: var(--dd-space-1);
  min-width: 0;
}

.copyable-text__label {
  font-weight: var(--dd-font-weight-semibold);
}

.copyable-text__row {
  display: flex;
  align-items: center;
  gap: var(--dd-space-2);
  min-width: 0;
}

.copyable-text__value {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  user-select: all;
}

.copyable-text__error {
  color: var(--dd-color-danger);
  font-size: var(--dd-font-size-sm);
}
</style>
