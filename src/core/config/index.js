import 'dotenv/config';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));

const VALID_NODE_ENVIRONMENTS = new Set(['development', 'test', 'production']);
const ENVIRONMENT = Object.freeze({
  port: Object.freeze({name: 'PORT', defaultValue: '3000'}),
  nodeEnv: Object.freeze({name: 'NODE_ENV', defaultValue: process.argv.includes('--production') ? 'production' : 'development'}),
  logLevel: Object.freeze({name: 'LOG_LEVEL', defaultValue: 'info'}),
  trustProxy: Object.freeze({name: 'TRUST_PROXY', defaultValue: 'loopback'}),
  sessionSecret: Object.freeze({name: 'SESSION_SECRET', defaultValue: 'pulse-development-only-session-secret'}),
  sessionName: Object.freeze({name: 'SESSION_NAME', defaultValue: 'pulse.sid'}),
  sessionTtlHours: Object.freeze({name: 'SESSION_TTL_HOURS', defaultValue: '12'}),
  authMaxFailedAttempts: Object.freeze({name: 'AUTH_MAX_FAILED_ATTEMPTS', defaultValue: '5'}),
  authLockMinutes: Object.freeze({name: 'AUTH_LOCK_MINUTES', defaultValue: '15'}),
  bootstrapAdminEmail: Object.freeze({name: 'BOOTSTRAP_ADMIN_EMAIL'}),
  bootstrapAdminName: Object.freeze({name: 'BOOTSTRAP_ADMIN_NAME'}),
  bootstrapAdminPassword: Object.freeze({name: 'BOOTSTRAP_ADMIN_PASSWORD'}),
  databaseUrl: Object.freeze({
    name: 'DATABASE_URL',
    defaultValue: 'postgresql://pulse:pulse-development-only@localhost:5432/pulse?schema=public'
  }),
  clinikoEnabled: Object.freeze({name: 'CLINIKO_ENABLED'}),
  clinikoApiKey: Object.freeze({name: 'CLINIKO_API_KEY'}),
  clinikoBaseUrl: Object.freeze({name: 'CLINIKO_BASE_URL', defaultValue: 'https://api.au4.cliniko.com/v1'}),
  clinikoUserAgent: Object.freeze({name: 'CLINIKO_USER_AGENT', defaultValue: 'Doveston Health Pulse (support@example.com)'}),
  xeroEnabled: Object.freeze({name: 'XERO_ENABLED'}),
  xeroClientId: Object.freeze({name: 'XERO_CLIENT_ID'}),
  xeroClientSecret: Object.freeze({name: 'XERO_CLIENT_SECRET'}),
  xeroRedirectUri: Object.freeze({name: 'XERO_REDIRECT_URI', defaultValue: 'http://localhost:3000/api/integrations/xero/callback'}),
  xeroTokenEncryptionKey: Object.freeze({name: 'XERO_TOKEN_ENCRYPTION_KEY'}),
  xeroAuthBaseUrl: Object.freeze({name: 'XERO_AUTH_BASE_URL', defaultValue: 'https://login.xero.com/identity/connect/authorize'}),
  xeroApiBaseUrl: Object.freeze({name: 'XERO_API_BASE_URL', defaultValue: 'https://api.xero.com/api.xro/2.0'}),
  xeroConnectionsUrl: Object.freeze({name: 'XERO_CONNECTIONS_URL', defaultValue: 'https://api.xero.com/connections'}),
  xeroTokenUrl: Object.freeze({name: 'XERO_TOKEN_URL', defaultValue: 'https://identity.xero.com/connect/token'}),
  xeroSyncLookbackDays: Object.freeze({name: 'XERO_SYNC_LOOKBACK_DAYS', defaultValue: '730'})
});

const readOptionalString = (setting) => process.env[setting.name]?.trim() || undefined;
const readString = (setting) => readOptionalString(setting) || setting.defaultValue;

function readBoolean(setting, fallback) {
  const value = readOptionalString(setting);
  if (value === undefined) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${setting.name} must be either true or false.`);
}

function readPort() {
  const rawPort = readString(ENVIRONMENT.port);
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function readPositiveInteger(setting) {
  const value = Number(readString(setting));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${setting.name} must be a positive integer.`);
  }
  return value;
}

function readTrustProxy() {
  const value = readString(ENVIRONMENT.trustProxy);
  if (value === 'true') return true;
  if (value === 'false') return false;

  const hops = Number(value);
  if (Number.isInteger(hops) && hops >= 0) return hops;

  return value;
}

function loadConfig() {
  const nodeEnv = readString(ENVIRONMENT.nodeEnv);
  const errors = [];

  if (!VALID_NODE_ENVIRONMENTS.has(nodeEnv)) {
    errors.push('NODE_ENV must be development, test, or production.');
  }

  let port;
  try {
    port = readPort();
  } catch (error) {
    errors.push(error.message);
  }

  let sessionTtlHours;
  let authMaxFailedAttempts;
  let authLockMinutes;
  for (const [setting, assign] of [
    [ENVIRONMENT.sessionTtlHours, (value) => { sessionTtlHours = value; }],
    [ENVIRONMENT.authMaxFailedAttempts, (value) => { authMaxFailedAttempts = value; }],
    [ENVIRONMENT.authLockMinutes, (value) => { authLockMinutes = value; }]
  ]) {
    try {
      assign(readPositiveInteger(setting));
    } catch (error) {
      errors.push(error.message);
    }
  }

  const configuredSessionSecret = readOptionalString(ENVIRONMENT.sessionSecret);
  const sessionSecret = configuredSessionSecret || ENVIRONMENT.sessionSecret.defaultValue;
  if (nodeEnv === 'production' && !configuredSessionSecret) {
    errors.push('SESSION_SECRET is required in production.');
  }

  const configuredDatabaseUrl = readOptionalString(ENVIRONMENT.databaseUrl);
  const databaseUrl = configuredDatabaseUrl || ENVIRONMENT.databaseUrl.defaultValue;
  if (nodeEnv === 'production' && !configuredDatabaseUrl) {
    errors.push('DATABASE_URL is required in production.');
  }

  const clinikoApiKey = readOptionalString(ENVIRONMENT.clinikoApiKey);
  let clinikoEnabled = Boolean(clinikoApiKey);
  try {
    clinikoEnabled = readBoolean(ENVIRONMENT.clinikoEnabled, clinikoEnabled);
  } catch (error) {
    errors.push(error.message);
  }
  if (clinikoEnabled && !clinikoApiKey) {
    errors.push('CLINIKO_API_KEY is required when Cliniko functionality is enabled.');
  }
  let clinikoBaseUrl;
  try {
    const parsedClinikoUrl = new URL(readString(ENVIRONMENT.clinikoBaseUrl));
    if (parsedClinikoUrl.protocol !== 'https:') throw new Error();
    if (!/(^|\.)cliniko\.com$/i.test(parsedClinikoUrl.hostname)) throw new Error();
    parsedClinikoUrl.pathname = parsedClinikoUrl.pathname.replace(/\/+$/, '');
    clinikoBaseUrl = parsedClinikoUrl.toString().replace(/\/$/, '');
  } catch {
    errors.push('CLINIKO_BASE_URL must be a valid HTTPS URL on an approved Cliniko host.');
  }
  const clinikoUserAgent = readString(ENVIRONMENT.clinikoUserAgent);
  if (clinikoEnabled && !/^[^()\r\n]+\([^()\s@]+@[^()\s@]+\.[^()\s@]+\)$/.test(clinikoUserAgent)) {
    errors.push('CLINIKO_USER_AGENT must include an application name and contact email in parentheses.');
  }
  if (clinikoEnabled && nodeEnv === 'production' && /@example\.(com|test)\)/i.test(clinikoUserAgent)) {
    errors.push('CLINIKO_USER_AGENT must use a monitored contact email in production.');
  }

  const xeroClientId = readOptionalString(ENVIRONMENT.xeroClientId);
  const xeroClientSecret = readOptionalString(ENVIRONMENT.xeroClientSecret);
  let xeroEnabled = Boolean(xeroClientId || xeroClientSecret);
  try {
    xeroEnabled = readBoolean(ENVIRONMENT.xeroEnabled, xeroEnabled);
  } catch (error) {
    errors.push(error.message);
  }
  if (xeroEnabled && (!xeroClientId || !xeroClientSecret)) {
    errors.push('XERO_CLIENT_ID and XERO_CLIENT_SECRET are required when Xero functionality is enabled.');
  }
  const xeroTokenEncryptionKey = readOptionalString(ENVIRONMENT.xeroTokenEncryptionKey);
  if (xeroEnabled && !xeroTokenEncryptionKey) errors.push('XERO_TOKEN_ENCRYPTION_KEY is required when Xero functionality is enabled.');
  const xeroUrl = (setting, hosts) => {
    try {
      const value = new URL(readString(setting));
      if (value.protocol !== 'https:' || !hosts.includes(value.hostname)) throw new Error();
      return value.toString();
    } catch {
      errors.push(`${setting.name} must use an approved Xero HTTPS host.`);
      return undefined;
    }
  };
  const xeroRedirectUri = readString(ENVIRONMENT.xeroRedirectUri);
  try {
    const redirect = new URL(xeroRedirectUri);
    if (!['https:', 'http:'].includes(redirect.protocol) || (redirect.protocol === 'http:' && redirect.hostname !== 'localhost')) throw new Error();
  } catch { errors.push('XERO_REDIRECT_URI must be HTTPS, or localhost HTTP for development.'); }
  let xeroSyncLookbackDays;
  try { xeroSyncLookbackDays = readPositiveInteger(ENVIRONMENT.xeroSyncLookbackDays); } catch (error) { errors.push(error.message); }

  if (errors.length > 0) {
    throw new Error(`Invalid application configuration:\n- ${errors.join('\n- ')}`);
  }

  return Object.freeze({
    app: Object.freeze({
      name: packageJson.name,
      version: packageJson.version
    }),
    nodeEnv,
    port,
    isProduction: nodeEnv === 'production',
    logLevel: readString(ENVIRONMENT.logLevel),
    trustProxy: readTrustProxy(),
    http: Object.freeze({
      shutdownTimeoutMs: 10000,
      rateLimit: Object.freeze({
        windowMs: 60000,
        limit: 100
      })
    }),
    sessionSecret,
    session: Object.freeze({
      name: readString(ENVIRONMENT.sessionName),
      ttlMs: sessionTtlHours * 60 * 60 * 1000
    }),
    auth: Object.freeze({
      maxFailedAttempts: authMaxFailedAttempts,
      lockDurationMs: authLockMinutes * 60 * 1000
    }),
    bootstrap: Object.freeze({
      email: readOptionalString(ENVIRONMENT.bootstrapAdminEmail),
      name: readOptionalString(ENVIRONMENT.bootstrapAdminName),
      password: readOptionalString(ENVIRONMENT.bootstrapAdminPassword)
    }),
    database: Object.freeze({
      url: databaseUrl
    }),
    cliniko: Object.freeze({
      enabled: clinikoEnabled,
      apiKey: clinikoApiKey,
      baseUrl: clinikoBaseUrl,
      userAgent: clinikoUserAgent
    }),
    xero: Object.freeze({
      enabled: xeroEnabled,
      clientId: xeroClientId,
      clientSecret: xeroClientSecret,
      redirectUri: xeroRedirectUri,
      tokenEncryptionKey: xeroTokenEncryptionKey,
      authBaseUrl: xeroUrl(ENVIRONMENT.xeroAuthBaseUrl, ['login.xero.com']),
      apiBaseUrl: xeroUrl(ENVIRONMENT.xeroApiBaseUrl, ['api.xero.com']),
      connectionsUrl: xeroUrl(ENVIRONMENT.xeroConnectionsUrl, ['api.xero.com']),
      tokenUrl: xeroUrl(ENVIRONMENT.xeroTokenUrl, ['identity.xero.com']),
      syncLookbackDays: xeroSyncLookbackDays
    })
  });
}

export const config = loadConfig();
