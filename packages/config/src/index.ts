export const DRIPDESK_ENV_PREFIX = 'DRIPDESK_';

export type DripdeskEnvironment = 'development' | 'test' | 'production';

export interface EnvSource {
  [key: string]: string | undefined;
}

export interface DripdeskConfig {
  env: DripdeskEnvironment;
  apiPort: number;
  publicWebUrl: string;
  publicApiUrl: string;
  databaseUrl: string;
  redisUrl: string;
  sessionSecret: string;
  jwtExpiresIn: string;
  passwordPepper: string;
  encryptionKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeCorePriceId: string;
  stripePlusPriceId: string;
  stripeProPriceId: string;
  defaultFromEmail: string;
  defaultFromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  logLevel: string;
  workerConcurrency: number;
  enableApiDocs: boolean;
}

const LEGACY_ENV_KEYS: Record<string, string[]> = {
  DRIPDESK_ENV: ['NODE_ENV'],
  DRIPDESK_PUBLIC_WEB_URL: ['APP_URL', 'NUXT_PUBLIC_APP_URL'],
  DRIPDESK_PUBLIC_API_URL: ['API_URL', 'NUXT_PUBLIC_API_URL'],
  DRIPDESK_DATABASE_URL: ['DATABASE_URL'],
  DRIPDESK_REDIS_URL: ['REDIS_URL'],
  DRIPDESK_SESSION_SECRET: ['JWT_SECRET'],
  DRIPDESK_STRIPE_SECRET_KEY: ['STRIPE_SECRET_KEY'],
  DRIPDESK_STRIPE_WEBHOOK_SECRET: ['STRIPE_WEBHOOK_SECRET'],
  DRIPDESK_STRIPE_CORE_PRICE_ID: ['STRIPE_CORE_PRICE_ID'],
  DRIPDESK_STRIPE_PLUS_PRICE_ID: ['STRIPE_PLUS_PRICE_ID'],
  DRIPDESK_STRIPE_PRO_PRICE_ID: ['STRIPE_PRO_PRICE_ID'],
  DRIPDESK_DEFAULT_FROM_EMAIL: ['DEFAULT_FROM_EMAIL'],
  DRIPDESK_DEFAULT_FROM_NAME: ['DEFAULT_FROM_NAME'],
  DRIPDESK_SMTP_HOST: ['SMTP_HOST'],
  DRIPDESK_SMTP_PORT: ['SMTP_PORT'],
  DRIPDESK_SMTP_USER: ['SMTP_USER'],
  DRIPDESK_SMTP_PASSWORD: ['SMTP_PASSWORD'],
  DRIPDESK_LOG_LEVEL: ['LOG_LEVEL'],
  DRIPDESK_WORKER_CONCURRENCY: ['WORKER_CONCURRENCY'],
  DRIPDESK_ENABLE_API_DOCS: ['ENABLE_API_DOCS'],
};

const PRODUCTION_REQUIRED_KEYS = [
  'DRIPDESK_PUBLIC_WEB_URL',
  'DRIPDESK_PUBLIC_API_URL',
  'DRIPDESK_DATABASE_URL',
  'DRIPDESK_REDIS_URL',
  'DRIPDESK_SESSION_SECRET',
  'DRIPDESK_PASSWORD_PEPPER',
  'DRIPDESK_ENCRYPTION_KEY',
] as const;

const CRITICAL_SECRET_KEYS = ['DRIPDESK_SESSION_SECRET', 'DRIPDESK_ENCRYPTION_KEY', 'DRIPDESK_PASSWORD_PEPPER'] as const;

function readRaw(env: EnvSource, key: string): string | undefined {
  const canonical = env[key];
  if (canonical !== undefined && canonical !== '') return canonical;

  for (const legacyKey of LEGACY_ENV_KEYS[key] ?? []) {
    const legacy = env[legacyKey];
    if (legacy !== undefined && legacy !== '') return legacy;
  }

  return undefined;
}

function readString(env: EnvSource, key: string, fallback: string): string {
  return readRaw(env, key) ?? fallback;
}

function readNumber(env: EnvSource, key: string, fallback: number): number {
  const raw = readRaw(env, key);
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(env: EnvSource, key: string, fallback: boolean): boolean {
  const raw = readRaw(env, key);
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function readEnvironment(env: EnvSource): DripdeskEnvironment {
  const raw = readString(env, 'DRIPDESK_ENV', 'development');
  if (raw === 'production' || raw === 'test') return raw;
  return 'development';
}

export function getMissingProductionConfig(env: EnvSource = process.env): string[] {
  const appEnv = readEnvironment(env);
  if (appEnv !== 'production') return [];

  return PRODUCTION_REQUIRED_KEYS.filter((key) => !readRaw(env, key));
}

/**
 * Validate that critical environment variables are set.
 * In production, throws an error if any are missing.
 * In development, logs a warning so the app can still start for testing
 * but the developer knows something is wrong.
 */
export function assertProductionConfig(env: EnvSource = process.env): void {
  const appEnv = readEnvironment(env);

  // Always check critical security secrets, even in dev
  const missingCritical = CRITICAL_SECRET_KEYS.filter((key) => !readRaw(env, key));
  if (missingCritical.length > 0) {
    const msg = [
      `Missing critical security variables: ${missingCritical.join(', ')}.`,
      'Generate them with:',
      ...missingCritical.map((key) => {
        const example = key === 'DRIPDESK_ENCRYPTION_KEY'
          ? `  openssl rand -hex 32  # then export ${key}=<result>`
          : `  openssl rand -base64 32  # then export ${key}=<result>`;
        return example;
      }),
      !appEnv ? '' : '',
    ].filter(Boolean).join('\n');

    if (appEnv === 'production') {
      throw new Error(msg);
    }
    console.warn(`WARNING: ${msg}`);
  }

  // Production-only required vars
  if (appEnv === 'production') {
    const missing = PRODUCTION_REQUIRED_KEYS.filter((key) => !readRaw(env, key));
    if (missing.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missing.join(', ')}.\n` +
        `Set these in your .env or environment before starting the server.`,
      );
    }
  }
}

export function readDripdeskConfig(env: EnvSource = process.env): DripdeskConfig {
  const appEnv = readEnvironment(env);

  return {
    env: appEnv,
    apiPort: readNumber(env, 'DRIPDESK_API_PORT', 3000),
    publicWebUrl: readString(env, 'DRIPDESK_PUBLIC_WEB_URL', 'http://localhost:3001'),
    publicApiUrl: readString(env, 'DRIPDESK_PUBLIC_API_URL', 'http://localhost:3000'),
    databaseUrl: readString(
      env,
      'DRIPDESK_DATABASE_URL',
      'postgresql://dripdesk:dripdesk@localhost:5432/dripdesk?schema=public',
    ),
    redisUrl: readString(env, 'DRIPDESK_REDIS_URL', 'redis://localhost:6379'),
    sessionSecret: readString(env, 'DRIPDESK_SESSION_SECRET', ''),
    jwtExpiresIn: readString(env, 'DRIPDESK_JWT_EXPIRES_IN', '7d'),
    passwordPepper: readString(env, 'DRIPDESK_PASSWORD_PEPPER', ''),
    encryptionKey: readString(env, 'DRIPDESK_ENCRYPTION_KEY', ''),
    stripeSecretKey: readString(env, 'DRIPDESK_STRIPE_SECRET_KEY', ''),
    stripeWebhookSecret: readString(env, 'DRIPDESK_STRIPE_WEBHOOK_SECRET', ''),
    stripeCorePriceId: readString(env, 'DRIPDESK_STRIPE_CORE_PRICE_ID', ''),
    stripePlusPriceId: readString(env, 'DRIPDESK_STRIPE_PLUS_PRICE_ID', ''),
    stripeProPriceId: readString(env, 'DRIPDESK_STRIPE_PRO_PRICE_ID', ''),
    defaultFromEmail: readString(env, 'DRIPDESK_DEFAULT_FROM_EMAIL', 'noreply@localhost'),
    defaultFromName: readString(env, 'DRIPDESK_DEFAULT_FROM_NAME', 'DripDesk'),
    smtpHost: readString(env, 'DRIPDESK_SMTP_HOST', 'localhost'),
    smtpPort: readNumber(env, 'DRIPDESK_SMTP_PORT', 1025),
    smtpUser: readString(env, 'DRIPDESK_SMTP_USER', ''),
    smtpPassword: readString(env, 'DRIPDESK_SMTP_PASSWORD', ''),
    logLevel: readString(env, 'DRIPDESK_LOG_LEVEL', appEnv === 'production' ? 'info' : 'debug'),
    workerConcurrency: readNumber(env, 'DRIPDESK_WORKER_CONCURRENCY', 5),
    enableApiDocs: readBoolean(env, 'DRIPDESK_ENABLE_API_DOCS', appEnv !== 'production'),
  };
}
