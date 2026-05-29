const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

const currentLevel: Level = (process.env.DRIPDESK_LOG_LEVEL as Level) ?? 'info';

function shouldLog(level: Level): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const entry = { level, message, timestamp: new Date().toISOString(), ...meta };
  if (level === 'error') {
    process.stderr.write(JSON.stringify(entry) + '\n');
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};
