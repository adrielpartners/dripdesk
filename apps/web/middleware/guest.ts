export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return;

  const auth = useAuthSession();

  if (!(await auth.verifySession())) return;

  if (auth.isRecipient.value) return navigateTo('/recipient');

  return navigateTo('/admin');
});
