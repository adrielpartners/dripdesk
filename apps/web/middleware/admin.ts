export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  const auth = useAuthSession();

  auth.loadStoredSession();

  if (!auth.isAuthenticated.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  }

  if (!auth.isAdminUser.value) {
    return navigateTo('/recipient');
  }
});
