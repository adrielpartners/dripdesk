<template>
  <label class="app-field" :for="selectId">
    <span v-if="label" class="app-field__label">{{ label }}</span>
    <select
      :id="selectId"
      class="app-select"
      :value="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

export interface AppSelectOption {
  label: string;
  value: string;
}

const props = withDefaults(
  defineProps<{
    id?: string;
    label?: string;
    modelValue?: string;
    placeholder?: string;
    options: AppSelectOption[];
    disabled?: boolean;
  }>(),
  {
    modelValue: '',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const generatedId = useId();
const selectId = computed(() => props.id ?? generatedId);
</script>

<style scoped>
.app-field {
  display: grid;
  gap: var(--dd-space-2);
}

.app-field__label {
  font-size: var(--dd-font-size-sm);
  font-weight: var(--dd-font-weight-medium);
}

.app-select {
  width: 100%;
  min-height: 2.75rem;
  border: var(--dd-border-width) solid var(--dd-color-border-strong);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  color: var(--dd-color-text);
  padding: 0 var(--dd-space-3);
}
</style>
