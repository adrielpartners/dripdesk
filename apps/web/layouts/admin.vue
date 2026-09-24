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
              <div class="shell__account">
                <span class="shell__user" :title="user?.email">{{ user?.email }}</span>
                <AppButton variant="ghost" size="sm" @click="handleLogout">Log out ↗</AppButton>
              </div>
            </div>
          </div>
          <div class="shell__navigation">
            <nav class="shell__nav" aria-label="Admin navigation">
              <NuxtLink v-for="(item, index) in navigation" :key="item.to" class="shell__nav-link" :class="{ 'is-active': isActive(item.to) }" :to="item.to" :aria-current="isActive(item.to) ? 'page' : undefined">
                <span class="shell__nav-number" aria-hidden="true">0{{ index + 1 }}</span>{{ item.label }}
              </NuxtLink>
            </nav>
            <details ref="settingsMenu" class="shell__settings">
              <summary class="shell__nav-link shell__settings-toggle" :class="{ 'is-active': isSettingsActive }" aria-label="Settings">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M10.2 2.8h3.6l.6 2.3c.4.1.8.3 1.2.5l2.1-1.2 2.5 2.5L19 9c.2.4.4.8.5 1.2l2.3.6v3.6l-2.3.6c-.1.4-.3.8-.5 1.2l1.2 2.1-2.5 2.5-2.1-1.2c-.4.2-.8.4-1.2.5l-.6 2.3h-3.6l-.6-2.3c-.4-.1-.8-.3-1.2-.5l-2.1 1.2-2.5-2.5L5 16.2c-.2-.4-.4-.8-.5-1.2l-2.3-.6v-3.6l2.3-.6c.1-.4.3-.8.5-1.2L3.8 6.9l2.5-2.5 2.1 1.2c.4-.2.8-.4 1.2-.5l.6-2.3Z" />
                  <circle cx="12" cy="12.6" r="3.1" />
                </svg>
                <span class="shell__settings-label">Settings</span>
              </summary>
              <nav class="shell__settings-menu" aria-label="Settings">
                <NuxtLink to="/admin/settings/integrations" :aria-current="isActive('/admin/settings/integrations') ? 'page' : undefined" @click="closeSettings">Integrations</NuxtLink>
                <NuxtLink to="/admin/billing" :aria-current="isActive('/admin/billing') ? 'page' : undefined" @click="closeSettings">Billing</NuxtLink>
              </nav>
            </details>
          </div>
        </div>
      </header>
      <main class="shell__body">
        <slot />
      </main>
      <footer class="shell__footer"><span>Small lessons. Real momentum.</span><span>A little progress, every day. ↗</span><AppThemePicker /></footer>
    </div>
    <template #fallback>
      <AppEmptyState title="Checking session" description="Confirming your sign-in." />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
const { user, logout } = useAuthSession();
const route = useRoute();
const settingsMenu = ref<HTMLDetailsElement | null>(null);
const navigation = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/campaigns', label: 'Campaigns' },
  { to: '/admin/persons', label: 'People' },
];
const isSettingsActive = computed(() => route.path.startsWith('/admin/settings') || route.path.startsWith('/admin/billing'));
function isActive(path: string) {
  return path === '/admin' ? route.path === path : route.path.startsWith(path);
}

function closeSettings() {
  if (settingsMenu.value) settingsMenu.value.open = false;
}

function handleOutsideClick(event: PointerEvent) {
  if (settingsMenu.value && !settingsMenu.value.contains(event.target as Node)) closeSettings();
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && settingsMenu.value?.open) {
    closeSettings();
    settingsMenu.value?.querySelector('summary')?.focus();
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick);
  document.addEventListener('keydown', handleEscape);
});
onUnmounted(() => {
  document.removeEventListener('pointerdown', handleOutsideClick);
  document.removeEventListener('keydown', handleEscape);
});

async function handleLogout() {
  await logout();
}
</script>
