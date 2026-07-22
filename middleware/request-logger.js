import crypto from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../logger.js';

function requestPath(url) {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return '/';
  }
}

export const requestLogger = pinoHttp({
  logger,
  genReqId(_request, response) {
    const requestId = crypto.randomUUID();
    response.setHeader('X-Request-ID', requestId);
    return requestId;
  },
  customProps(request) {
    return {requestId: request.id};
  },
  customLogLevel(_request, response, error) {
    if (error || response.statusCode >= 500) return 'error';
    if (response.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(request) {
      return {
        id: request.id,
        method: request.method,
        path: requestPath(request.url),
        remoteAddress: request.remoteAddress
      };
    },
    res(response) {
      return {statusCode: response.statusCode};
    }
  }
});
