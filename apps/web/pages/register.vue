<template>
  <AppCard title="Create your DripDesk account">
    <form class="auth-form" @submit.prevent="handleSubmit">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--dd-space-4)">
        <AppInput
          v-model="firstName"
          label="First name"
          placeholder="John"
          autocomplete="given-name"
        />
        <AppInput
          v-model="lastName"
          label="Last name"
          placeholder="Doe"
          autocomplete="family-name"
        />
      </div>
      <AppInput
        v-model="organizationName"
        label="Organization name"
        placeholder="Acme Corp"
      />
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
        placeholder="At least 8 characters"
        autocomplete="new-password"
      />
      <AppEmptyState v-if="error" tone="danger" title="Registration failed" :description="error" />
      <AppButton type="submit" size="lg" :disabled="pending">
        {{ pending ? 'Creating account' : 'Create account' }}
      </AppButton>
      <p style="color:var(--dd-color-text-muted);font-size:var(--dd-font-size-sm);text-align:center;margin:0">
        Already have an account?
        <NuxtLink to="/login">Sign in</NuxtLink>
      </p>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
});

const email = ref('');
const password = ref('');
const firstName = ref('');
const lastName = ref('');
const organizationName = ref('');
const auth = useAuthSession();
const { pending, error } = auth;

async function handleSubmit() {
  await auth.register({
    email: email.value,
    password: password.value,
    organizationName: organizationName.value,
    firstName: firstName.value || undefined,
    lastName: lastName.value || undefined,
  });

  await navigateTo('/admin');
}
</script>
