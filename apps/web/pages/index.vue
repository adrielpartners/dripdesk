<template>
  <AppEmptyState title="Opening DripDesk" description="Taking you to the right workspace." />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: () => {
    if (import.meta.server) return;

    const auth = useAuthSession();

    auth.loadStoredSession();

    if (!auth.isAuthenticated.value) return navigateTo('/login');
    if (auth.isRecipient.value) return navigateTo('/recipient');

    return navigateTo('/admin');
  },
});
</script>
