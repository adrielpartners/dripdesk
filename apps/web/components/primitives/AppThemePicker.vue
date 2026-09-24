<template>
  <label class="theme-picker">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="4" /><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
    </svg>
    <span class="sr-only">Appearance theme</span>
    <select v-model="selectedTheme" aria-label="Appearance theme">
      <option v-for="item in themes" :key="item.id" :value="item.id">{{ item.label }}</option>
    </select>
  </label>
</template>

<script setup lang="ts">
const { theme, themes, setTheme } = useAppearance();
const selectedTheme = computed({ get: () => theme.value, set: setTheme });
</script>

<style scoped>
.theme-picker { display: inline-flex; align-items: center; gap: var(--dd-space-2); padding: var(--dd-space-1) var(--dd-space-3); border: 1px solid var(--dd-color-border); border-radius: var(--dd-radius-pill); background: var(--dd-color-surface); color: var(--dd-color-text); }
.theme-picker select { min-height: 2.25rem; max-width: 8rem; border: 0; background: transparent; color: inherit; font-size: var(--dd-font-size-sm); font-weight: var(--dd-font-weight-semibold); cursor: pointer; }
</style>
