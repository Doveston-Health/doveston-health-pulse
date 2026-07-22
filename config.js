import 'dotenv/config';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const VALID_NODE_ENVIRONMENTS = new Set(['development', 'test', 'production']);
const ENVIRONMENT = Object.freeze({
  port: Object.freeze({name: 'PORT', defaultValue: '3000'}),
  nodeEnv: Object.freeze({name: 'NODE_ENV', defaultValue: process.argv.includes('--production') ? 'production' : 'development'}),
  logLevel: Object.freeze({name: 'LOG_LEVEL', defaultValue: 'info'}),
  trustProxy: Object.freeze({name: 'TRUST_PROXY', defaultValue: 'loopback'}),
  sessionSecret: Object.freeze({name: 'SESSION_SECRET', defaultValue: 'pulse-development-only-session-secret'}),
  clinikoEnabled: Object.freeze({name: 'CLINIKO_ENABLED'}),
  clinikoApiKey: Object.freeze({name: 'CLINIKO_API_KEY'}),
  clinikoUserAgent: Object.freeze({name: 'CLINIKO_USER_AGENT', defaultValue: 'Doveston Health Pulse'}),
  xeroEnabled: Object.freeze({name: 'XERO_ENABLED'}),
  xeroClientId: Object.freeze({name: 'XERO_CLIENT_ID'}),
  xeroClientSecret: Object.freeze({name: 'XERO_CLIENT_SECRET'}),
  xeroRedirectUri: Object.freeze({name: 'XERO_REDIRECT_URI', defaultValue: 'http://localhost:3000/api/xero/callback'})
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

  const configuredSessionSecret = readOptionalString(ENVIRONMENT.sessionSecret);
  const sessionSecret = configuredSessionSecret || ENVIRONMENT.sessionSecret.defaultValue;
  if (nodeEnv === 'production' && !configuredSessionSecret) {
    errors.push('SESSION_SECRET is required in production.');
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
    cliniko: Object.freeze({
      enabled: clinikoEnabled,
      apiKey: clinikoApiKey,
      userAgent: readString(ENVIRONMENT.clinikoUserAgent)
    }),
    xero: Object.freeze({
      enabled: xeroEnabled,
      clientId: xeroClientId,
      clientSecret: xeroClientSecret,
      redirectUri: readString(ENVIRONMENT.xeroRedirectUri)
    })
  });
}

export const config = loadConfig();
