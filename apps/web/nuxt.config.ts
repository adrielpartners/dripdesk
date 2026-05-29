import { defineNuxtConfig } from 'nuxt/config';
import type { NuxtConfig } from 'nuxt/schema';

const config: NuxtConfig = {
  compatibilityDate: '2026-05-28',
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css', '~/assets/css/shell.css'],
  components: [
    {
      path: '~/components/primitives',
      pathPrefix: false,
    },
  ],
  devtools: { enabled: false },
  typescript: {
    strict: true,
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.DRIPDESK_PUBLIC_API_URL ?? 'http://localhost:3000',
      webUrl: process.env.DRIPDESK_PUBLIC_WEB_URL ?? 'http://localhost:3001',
    },
  },
};

export default defineNuxtConfig(config);
