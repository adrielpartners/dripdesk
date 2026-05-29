import { assertProductionConfig, readDripdeskConfig } from '@dripdesk/config';

export function validateEnvironment(config: Record<string, string | undefined>) {
  assertProductionConfig(config);
  return config;
}

export function loadDripdeskConfig() {
  return {
    dripdesk: readDripdeskConfig(process.env),
  };
}
