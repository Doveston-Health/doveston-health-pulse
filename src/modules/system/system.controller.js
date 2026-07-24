import { getHealthStatus, getReadinessStatus } from './system.service.js';

export function getHealth(_request, response) {
  response.json(getHealthStatus());
}

export function getReadiness(request, response) {
  const readiness = getReadinessStatus(request.app.locals.isReady === true);
  response.status(readiness.ready ? 200 : 503).json(readiness);
}
