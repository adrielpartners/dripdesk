import { computed } from 'vue';

type UserRole = 'owner' | 'admin' | 'recipient';

interface AuthUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  organizationId?: string | null;
}

interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

const STORAGE_KEY = 'dripdesk.auth.session';

export function useAuthSession() {
  const session = useState<AuthSession | null>('auth-session', () => null);
  const pending = useState<boolean>('auth-pending', () => false);
  const error = useState<string | null>('auth-error', () => null);
  const config = useRuntimeConfig();

  function loadStoredSession() {
    if (!import.meta.client || session.value) return session.value;

    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return null;

    try {
      session.value = JSON.parse(storedValue) as AuthSession;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      session.value = null;
    }

    return session.value;
  }

  function setSession(nextSession: AuthSession | null) {
    session.value = nextSession;

    if (!import.meta.client) return;

    if (nextSession) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function login(email: string, password: string) {
    pending.value = true;
    error.value = null;

    try {
      const response = await $fetch<ApiEnvelope<AuthSession>>('/auth/login', {
        baseURL: config.public.apiUrl,
        method: 'POST',
        body: { email, password },
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error?.message ?? 'Login failed');
      }

      setSession(response.data);
      return response.data;
    } catch (loginError) {
      error.value = loginError instanceof Error ? loginError.message : 'Login failed';
      throw loginError;
    } finally {
      pending.value = false;
    }
  }

  function logout() {
    setSession(null);
    return navigateTo('/login');
  }

  const currentSession = computed(() => session.value ?? loadStoredSession());
  const user = computed(() => currentSession.value?.user ?? null);
  const role = computed(() => user.value?.role ?? null);
  const isAuthenticated = computed(() => Boolean(currentSession.value?.accessToken));
  const isAdminUser = computed(() => role.value === 'owner' || role.value === 'admin');
  const isRecipient = computed(() => role.value === 'recipient');

  return {
    session: currentSession,
    user,
    role,
    pending,
    error,
    isAuthenticated,
    isAdminUser,
    isRecipient,
    loadStoredSession,
    login,
    logout,
  };
}
