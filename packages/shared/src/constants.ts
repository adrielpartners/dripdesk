export const CHANNELS = ['SMS', 'EMAIL', 'TELEGRAM', 'WHATSAPP'] as const;

export const DEFAULT_SEND_TIME = '09:00';
export const DEFAULT_TIMEZONE = 'UTC';
export const MAGIC_LINK_EXPIRY_MINUTES = 15;
export const SESSION_EXPIRY_DAYS = 7;

export const QUEUE_NAMES = {
  MESSAGES: 'messages',
  SCHEDULING: 'scheduling',
} as const;

export const JOB_NAMES = {
  SEND_MESSAGE: 'send-message',
  SCHEDULE_STEPS: 'schedule-steps',
} as const;

export const BILLING_PLANS = {
  FREE: 'free',
  CORE: 'core',
  PLUS: 'plus',
  PRO: 'pro',
  LIFETIME_CORE: 'lifetime_core',
  LIFETIME_PLUS: 'lifetime_plus',
} as const;

export const FREE_PLAN_CONTACT_LIMIT = 10;
export const TRIAL_DAYS = 14;

export const MAX_SMS_LENGTH = 160;
export const MAX_IMPORT_BATCH_SIZE = 1000;
