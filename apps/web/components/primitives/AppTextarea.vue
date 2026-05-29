<template>
  <label class="app-field" :for="textareaId">
    <span v-if="label" class="app-field__label">{{ label }}</span>
    <textarea
      :id="textareaId"
      class="app-textarea"
      :class="{ 'app-textarea--invalid': error }"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="descriptionId"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
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
    placeholder?: string;
    hint?: string;
    error?: string;
    rows?: number;
    disabled?: boolean;
  }>(),
  {
    modelValue: '',
    rows: 4,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const generatedId = useId();
const textareaId = computed(() => props.id ?? generatedId);
const descriptionId = computed(() =>
  props.hint || props.error ? `${textareaId.value}-description` : undefined,
);
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

.app-textarea {
  width: 100%;
  min-height: 7rem;
  resize: vertical;
  border: var(--dd-border-width) solid var(--dd-color-border-strong);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  color: var(--dd-color-text);
  padding: var(--dd-space-3);
}

.app-textarea::placeholder {
  color: var(--dd-color-text-muted);
}

.app-textarea--invalid {
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
