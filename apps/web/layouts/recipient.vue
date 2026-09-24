<template>
  <ClientOnly>
    <div class="shell">
      <header class="shell__header">
        <div class="shell__header-inner">
          <div class="shell__topline">
            <AppBrand to="/recipient" />
            <div class="shell__tools">
              <AppThemePicker />
              <div class="shell__account">
                <span class="shell__user">{{ user?.email }}</span>
                <AppButton variant="ghost" size="sm" @click="logout">Log out ↗</AppButton>
              </div>
            </div>
          </div>
          <nav class="shell__nav" aria-label="Recipient navigation">
            <NuxtLink class="shell__nav-link" :class="{ 'is-active': route.path !== '/recipient/settings' }" to="/recipient">My lessons</NuxtLink>
            <NuxtLink class="shell__nav-link" :class="{ 'is-active': route.path === '/recipient/settings' }" to="/recipient/settings">Settings</NuxtLink>
          </nav>
        </div>
      </header>
      <main class="shell__body">
        <slot />
      </main>
      <footer class="shell__footer"><span>One little lesson at a time.</span><span>You've got this. ↗</span></footer>
    </div>
    <template #fallback>
      <AppEmptyState title="Checking session" description="Confirming your sign-in." />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
const { user, logout } = useAuthSession();
const route = useRoute();
</script>
