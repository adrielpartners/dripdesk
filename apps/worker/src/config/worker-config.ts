import { assertProductionConfig, readDripdeskConfig } from '@dripdesk/config';

export function loadWorkerConfig() {
  assertProductionConfig(process.env);
  return readDripdeskConfig(process.env);
}
