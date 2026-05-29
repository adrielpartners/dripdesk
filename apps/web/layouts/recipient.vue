<template>
  <div class="shell">
    <header class="shell__header">
      <div class="shell__header-inner">
        <div class="shell__topline">
          <NuxtLink class="shell__brand" to="/recipient">DripDesk</NuxtLink>
          <span class="shell__user">{{ user?.email }}</span>
        </div>
        <nav class="shell__nav" aria-label="Recipient navigation">
          <NuxtLink class="shell__nav-link" to="/recipient">My lessons</NuxtLink>
          <NuxtLink class="shell__nav-link" to="/recipient/settings">Settings</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="shell__body">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuthSession();
</script>
