import { checkDatabaseHealth } from '../../core/database/database-health.js';
import { getHealthStatus, getReadinessStatus } from './system.service.js';

export function getHealth(_request, response) {
  response.json(getHealthStatus());
}

export async function getReadiness(request, response) {
  const databaseReady = await checkDatabaseHealth();
  request.app.locals.databaseReady = databaseReady;
  const readiness = getReadinessStatus(request.app.locals.isReady === true, databaseReady);
  response.status(readiness.ready ? 200 : 503).json(readiness);
}
