import { config } from '../../core/config/index.js';

export function getHealthStatus() {
  const integrations = {
    clinikoConfigured: config.cliniko.enabled,
    xeroConfigured: config.xero.enabled
  };

  return {
    ok: true,
    status: 'ok',
    uptime: process.uptime(),
    version: config.app.version,
    environment: config.nodeEnv,
    ...integrations,
    integrations
  };
}

export function getReadinessStatus(isReady) {
  return {
    ready: isReady,
    status: isReady ? 'ready' : 'not_ready'
  };
}
