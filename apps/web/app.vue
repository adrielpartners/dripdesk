<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { theme } = useAppearance();
useHead(() => ({ htmlAttrs: { 'data-theme': theme.value, lang: 'en' } }));
</script>
