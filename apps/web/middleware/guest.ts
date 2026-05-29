export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return;

  const auth = useAuthSession();

  auth.loadStoredSession();

  if (!auth.isAuthenticated.value) return;

  if (auth.isRecipient.value) return navigateTo('/recipient');

  return navigateTo('/admin');
});
