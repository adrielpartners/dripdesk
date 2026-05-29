<template>
  <label class="app-field" :for="inputId">
    <span v-if="label" class="app-field__label">{{ label }}</span>
    <input
      :id="inputId"
      class="app-input"
      :class="{ 'app-input--invalid': error }"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="descriptionId"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" :id="descriptionId" class="app-field__error">{{ error }}</span>
    <span v-else-if="hint" :id="descriptionId" class="app-field__hint">{{ hint }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    id?: string;
    label?: string;
    modelValue?: string;
    type?: string;
    placeholder?: string;
    autocomplete?: string;
    hint?: string;
    error?: string;
    disabled?: boolean;
  }>(),
  {
    modelValue: '',
    type: 'text',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const generatedId = useId();
const inputId = computed(() => props.id ?? generatedId);
const descriptionId = computed(() =>
  props.hint || props.error ? `${inputId.value}-description` : undefined,
);
</script>

<style scoped>
.app-field {
  display: grid;
  gap: var(--dd-space-2);
}

.app-field__label {
  color: var(--dd-color-text);
  font-size: var(--dd-font-size-sm);
  font-weight: var(--dd-font-weight-medium);
}

.app-input {
  width: 100%;
  min-height: 2.75rem;
  border: var(--dd-border-width) solid var(--dd-color-border-strong);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  color: var(--dd-color-text);
  padding: 0 var(--dd-space-3);
}

.app-input::placeholder {
  color: var(--dd-color-text-muted);
}

.app-input--invalid {
  border-color: var(--dd-color-danger);
}

.app-field__hint,
.app-field__error {
  font-size: var(--dd-font-size-sm);
}

.app-field__hint {
  color: var(--dd-color-text-muted);
}

.app-field__error {
  color: var(--dd-color-danger);
}
</style>
