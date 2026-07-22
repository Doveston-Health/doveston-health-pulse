import pino from 'pino';
import { config } from './config.js';

const secretValues = [
  config.sessionSecret,
  config.cliniko.apiKey,
  config.xero.clientSecret
].filter(Boolean);

export function redactSensitiveText(value) {
  if (typeof value !== 'string') return value;

  let redacted = value
    .replace(/\b(Basic|Bearer)\s+[^\s]+/gi, '$1 [Redacted]')
    .replace(/([?&](?:code|token|access_token|refresh_token|client_secret)=)[^&\s]+/gi, '$1[Redacted]');

  for (const secret of secretValues) {
    redacted = redacted.replaceAll(secret, '[Redacted]');
  }

  return redacted;
}

export const logger = pino({
  level: config.logLevel,
  base: {
    service: config.app.name,
    version: config.app.version,
    environment: config.nodeEnv
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers.set-cookie',
      '*.authorization',
      '*.cookie',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.clientSecret',
      '*.sessionSecret',
      '*.apiKey'
    ],
    censor: '[Redacted]'
  },
  serializers: {
    err(error) {
      return {
        type: error?.name,
        message: redactSensitiveText(error?.message),
        stack: config.isProduction ? undefined : redactSensitiveText(error?.stack)
      };
    }
  }
});
