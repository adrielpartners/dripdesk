<template>
  <ClientOnly>
    <div class="shell">
      <header class="shell__header">
        <div class="shell__header-inner">
          <div class="shell__topline">
            <div class="shell__brand-group">
              <AppBrand to="/admin" />
              <span class="shell__tagline">your delivery studio</span>
            </div>
            <div class="shell__tools">
              <AppThemePicker />
              <div class="shell__account">
                <span class="shell__user">{{ user?.email }}</span>
                <AppButton variant="ghost" size="sm" @click="handleLogout">Log out ↗</AppButton>
              </div>
            </div>
          </div>
          <nav class="shell__nav" aria-label="Admin navigation">
            <NuxtLink v-for="(item, index) in navigation" :key="item.to" class="shell__nav-link" :class="{ 'is-active': isActive(item.to) }" :to="item.to" :aria-current="isActive(item.to) ? 'page' : undefined">
              <span class="shell__nav-number" aria-hidden="true">0{{ index + 1 }}</span>{{ item.label }}
            </NuxtLink>
          </nav>
        </div>
      </header>
      <main class="shell__body">
        <slot />
      </main>
      <footer class="shell__footer"><span>Small lessons. Real momentum.</span><span>A little progress, every day. ↗</span></footer>
    </div>
    <template #fallback>
      <AppEmptyState title="Checking session" description="Confirming your sign-in." />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
const { user, logout } = useAuthSession();
const route = useRoute();
const navigation = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/campaigns', label: 'Campaigns' },
  { to: '/admin/persons', label: 'People' },
  { to: '/admin/settings/integrations', label: 'Integrations' },
  { to: '/admin/billing', label: 'Billing' },
];
function isActive(path: string) {
  return path === '/admin' ? route.path === path : route.path.startsWith(path);
}

async function handleLogout() {
  await logout();
}
</script>
