import { Router } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { getHealth, getReadiness } from './system.controller.js';

export function createSystemRouter({
  healthHandler = getHealth,
  readinessHandler = getReadiness
} = {}) {
  const router = Router();

  router.get('/health', healthHandler);
  router.get('/ready', asyncHandler(readinessHandler));
  return router;
}

export const systemRouter = createSystemRouter();
