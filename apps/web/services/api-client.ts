interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function apiRequest<T>(path: string, options: Parameters<typeof $fetch>[1] = {}) {
  const config = useRuntimeConfig();
  const auth = useAuthSession();
  const headers = new Headers(options.headers as HeadersInit | undefined);

  if (auth.session.value?.accessToken) {
    headers.set('Authorization', `Bearer ${auth.session.value.accessToken}`);
  }

  if (auth.user.value?.organizationId) {
    headers.set('x-dripdesk-organization-id', auth.user.value.organizationId);
  }

  const response = await $fetch<ApiEnvelope<T>>(path, {
    ...options,
    baseURL: config.public.apiUrl,
    headers,
  });

  if (!response.ok || response.data === undefined) {
    throw new Error(response.error?.message ?? 'Request failed');
  }

  return response.data;
}

