export function createBullmqConnectionOptions(redisUrl: string) {
  const parsed = new URL(redisUrl);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : undefined,
    connectTimeout: 5000,
    maxRetriesPerRequest: null,
    retryStrategy: (attempt: number) => (attempt > 3 ? null : Math.min(attempt * 500, 2000)),
  };
}
