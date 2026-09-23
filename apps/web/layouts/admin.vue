<template>
  <div class="shell">
    <header class="shell__header">
      <div class="shell__header-inner">
        <div class="shell__topline">
          <NuxtLink class="shell__brand" to="/admin">DripDesk</NuxtLink>
          <div class="shell__account">
            <span class="shell__user">{{ user?.email }}</span>
            <AppButton variant="ghost" size="sm" @click="handleLogout">Log out</AppButton>
          </div>
        </div>
        <nav class="shell__nav" aria-label="Admin navigation">
          <NuxtLink class="shell__nav-link" to="/admin">Dashboard</NuxtLink>
          <NuxtLink class="shell__nav-link" to="/admin/campaigns">Campaigns</NuxtLink>
          <NuxtLink class="shell__nav-link" to="/admin/persons">People</NuxtLink>
          <NuxtLink class="shell__nav-link" to="/admin/settings/integrations">Integrations</NuxtLink>
          <NuxtLink class="shell__nav-link" to="/admin/billing">Billing</NuxtLink>
        </nav>
        <p v-if="logoutError" role="alert">{{ logoutError }}</p>
      </div>
    </header>
    <main class="shell__body">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { user, logout } = useAuthSession();
const logoutError = ref('');

async function handleLogout() {
  logoutError.value = '';
  try {
    await logout();
  } catch {
    logoutError.value = 'Could not end your session. Please try again.';
  }
}
</script>
