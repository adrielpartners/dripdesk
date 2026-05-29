<template>
  <Teleport to="body">
    <div v-if="open" class="app-dialog" role="presentation" @click.self="emit('close')">
      <section
        class="app-dialog__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
      >
        <header class="app-dialog__header">
          <h2 v-if="title" :id="titleId" class="app-dialog__title">{{ title }}</h2>
          <button class="app-dialog__close" type="button" aria-label="Close dialog" @click="emit('close')">
            ×
          </button>
        </header>
        <div class="app-dialog__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="app-dialog__footer">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  open: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const titleId = useId();
</script>

<style scoped>
.app-dialog {
  position: fixed;
  inset: 0;
  z-index: var(--dd-z-dialog);
  display: grid;
  place-items: end center;
  background: rgb(17 24 39 / 0.42);
  padding: var(--dd-space-4);
}

.app-dialog__panel {
  width: min(100%, 34rem);
  max-height: calc(100vh - var(--dd-space-8));
  overflow: auto;
  border-radius: var(--dd-radius-lg);
  background: var(--dd-color-surface);
  box-shadow: var(--dd-shadow-md);
}

.app-dialog__header,
.app-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dd-space-4);
  padding: var(--dd-space-4) var(--dd-space-5);
}

.app-dialog__header {
  border-bottom: var(--dd-border-width) solid var(--dd-color-border);
}

.app-dialog__footer {
  border-top: var(--dd-border-width) solid var(--dd-color-border);
}

.app-dialog__title {
  margin: 0;
  font-size: var(--dd-font-size-lg);
  line-height: var(--dd-line-height-tight);
}

.app-dialog__body {
  padding: var(--dd-space-5);
}

.app-dialog__close {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: var(--dd-border-width) solid var(--dd-color-border);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  color: var(--dd-color-text);
  font-size: var(--dd-font-size-xl);
  line-height: 1;
}

@media (min-width: 48rem) {
  .app-dialog {
    place-items: center;
  }
}
</style>
