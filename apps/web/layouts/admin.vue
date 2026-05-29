<template>
  <div class="shell">
    <header class="shell__header">
      <div class="shell__header-inner">
        <div class="shell__topline">
          <NuxtLink class="shell__brand" to="/admin">DripDesk</NuxtLink>
          <span class="shell__user">{{ user?.email }}</span>
        </div>
        <nav class="shell__nav" aria-label="Admin navigation">
          <NuxtLink class="shell__nav-link" to="/admin">Dashboard</NuxtLink>
          <NuxtLink class="shell__nav-link" to="/admin/campaigns">Campaigns</NuxtLink>
          <NuxtLink class="shell__nav-link" to="/admin/persons">People</NuxtLink>
          <NuxtLink class="shell__nav-link" to="/admin/settings/integrations">Integrations</NuxtLink>
          <NuxtLink class="shell__nav-link" to="/admin/billing">Billing</NuxtLink>
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
