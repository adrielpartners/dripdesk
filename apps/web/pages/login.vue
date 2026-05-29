<template>
  <AppCard title="Sign in to DripDesk">
    <form class="auth-form" @submit.prevent="handleSubmit">
      <AppInput
        v-model="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
      />
      <AppInput
        v-model="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        autocomplete="current-password"
      />
      <AppEmptyState v-if="error" title="Sign in failed" :description="error" />
      <AppButton type="submit" size="lg" :disabled="pending">
        {{ pending ? 'Signing in' : 'Sign in' }}
      </AppButton>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
});

const route = useRoute();
const email = ref('');
const password = ref('');
const auth = useAuthSession();
const { pending, error } = auth;

async function handleSubmit() {
  const session = await auth.login(email.value, password.value);
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;

  if (redirect) {
    await navigateTo(redirect);
    return;
  }

  await navigateTo(session.user.role === 'recipient' ? '/recipient' : '/admin');
}
</script>
