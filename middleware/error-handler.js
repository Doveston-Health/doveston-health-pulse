import { config } from '../config.js';
import { redactSensitiveText } from '../logger.js';

export function apiNotFound(request, response) {
  response.status(404).json({
    error: 'API endpoint not found.',
    requestId: request.id
  });
}

export function errorHandler(error, request, response, _next) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const logLevel = statusCode >= 500 ? 'error' : 'warn';

  request.log[logLevel]({
    error: {
      type: error.name,
      message: redactSensitiveText(error.message),
      stack: config.isProduction ? undefined : redactSensitiveText(error.stack)
    },
    statusCode
  }, 'request failed');

  const payload = {
    error: statusCode >= 500 ? 'Internal server error.' : error.message,
    requestId: request.id
  };

  if (!config.isProduction && statusCode >= 500) {
    payload.details = redactSensitiveText(error.message);
    payload.stack = redactSensitiveText(error.stack);
  }

  response.status(statusCode).json(payload);
}
