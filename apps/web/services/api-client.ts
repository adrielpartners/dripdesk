import { getApiErrorMessage } from '~/services/api-errors';

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
  const requestToken = auth.session.value?.accessToken;

  if (requestToken) {
    headers.set('Authorization', `Bearer ${requestToken}`);
  }

  if (auth.user.value?.organizationId) {
    headers.set('x-dripdesk-organization-id', auth.user.value.organizationId);
  }

  let response: ApiEnvelope<T> | undefined;
  let status: number;

  try {
    const result = await $fetch.raw<ApiEnvelope<T>>(path, {
      ...options,
      baseURL: config.public.apiUrl,
      headers,
      ignoreResponseError: true,
    });
    response = result._data;
    status = result.status;
  } catch (error) {
    throw new Error(getApiErrorMessage(error), { cause: error });
  }

  if (status === 401 && requestToken && auth.session.value?.accessToken === requestToken) {
    auth.clearSession();

    if (import.meta.client && path !== '/auth/me' && path !== '/auth/logout') {
      const redirect = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
    }

    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!response?.ok || response.data === undefined) {
    throw new Error(getApiErrorMessage({ response: { status, _data: response } }));
  }

  return response.data;
}
