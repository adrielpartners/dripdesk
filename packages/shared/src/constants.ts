export const CHANNELS = ['sms', 'telegram', 'email'] as const;

export const USER_ROLES = ['owner', 'admin', 'recipient'] as const;
export const ORGANIZATION_MEMBER_ROLES = ['owner', 'admin'] as const;

export const DEFAULT_SEND_TIME = '09:00';
export const DEFAULT_TIMEZONE = 'UTC';
export const MAGIC_LINK_EXPIRY_MINUTES = 15;
export const SESSION_EXPIRY_DAYS = 7;

export const QUEUE_NAMES = {
  DRIPDESK: 'dripdesk',
} as const;

export const JOB_NAMES = {
  TEST_JOB: 'test-job',
  SCHEDULE_DUE_STEPS: 'schedule-due-steps',
  SEND_MESSAGE: 'send-message',
  PROCESS_PROVIDER_EVENT: 'process-provider-event',
  EVALUATE_PROGRESS: 'evaluate-progress',
  CLEANUP_EXPIRED_TOKENS: 'cleanup-expired-tokens',
} as const;

export const QUEUE_DEFAULTS = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5000,
  REMOVE_ON_COMPLETE: 1000,
  REMOVE_ON_FAIL: 5000,
  WORKER_CONCURRENCY: 5,
  SCHEDULE_DUE_STEPS_EVERY_MS: 60000,
} as const;

export const BILLING_PLANS = {
  FREE: 'free',
  CORE: 'core',
  PLUS: 'plus',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const BILLING_PLAN_ACTIVE_CONTACT_LIMITS = {
  [BILLING_PLANS.FREE]: 10,
  [BILLING_PLANS.CORE]: 250,
  [BILLING_PLANS.PLUS]: 1000,
  [BILLING_PLANS.PRO]: 5000,
  [BILLING_PLANS.ENTERPRISE]: null,
} as const;

export const FREE_PLAN_CONTACT_LIMIT = BILLING_PLAN_ACTIVE_CONTACT_LIMITS.free;
export const TRIAL_DAYS = 14;

export const ACTIVE_CONTACT_WINDOW_DAYS = 30;

export const MAX_SMS_LENGTH = 160;
export const MAX_IMPORT_BATCH_SIZE = 1000;
