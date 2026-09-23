export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const auth = useAuthSession();

  if (!(await auth.verifySession())) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  }

  if (!auth.isAdminUser.value) {
    return navigateTo('/recipient');
  }
});
