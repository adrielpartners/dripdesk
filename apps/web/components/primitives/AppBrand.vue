<template>
  <NuxtLink class="app-brand" :to="to" aria-label="DripDesk home">
    <svg class="app-brand__mark" viewBox="0 0 40 44" width="34" height="38" aria-hidden="true">
      <path d="M20 3C15 10 5 20 5 28a15 15 0 0 0 30 0C35 20 25 10 20 3Z" fill="var(--dd-color-primary)" stroke="currentColor" stroke-width="2" />
      <path d="M14 29q6 7 12 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="14" cy="24" r="1.4" fill="currentColor" /><circle cx="26" cy="24" r="1.4" fill="currentColor" />
    </svg>
    <span>drip<span class="app-brand__desk">desk</span><span class="app-brand__dot">.</span></span>
  </NuxtLink>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ to?: string }>(), { to: '/' });
</script>

<style scoped>
.app-brand { display: inline-flex; align-items: center; gap: var(--dd-space-2); color: var(--dd-color-text); font-family: var(--dd-font-display); font-size: 1.8rem; font-weight: 800; letter-spacing: -0.08em; text-decoration: none; white-space: nowrap; }
.app-brand__desk { font-weight: 500; }
.app-brand__dot { color: var(--dd-color-text); }
.app-brand__mark { flex: none; transition: transform var(--dd-duration-normal) var(--dd-ease-standard); }
.app-brand:hover .app-brand__mark { transform: rotate(-9deg); }
</style>
