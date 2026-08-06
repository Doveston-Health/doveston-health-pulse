import {Router} from 'express';
import {requireRole} from '../auth/auth.middleware.js';
import {asyncHandler} from '../../shared/http/async-handler.js';
import {list} from './practitioners.controller.js';

const allowedRoles = ['DIRECTOR', 'PRACTICE_MANAGER', 'ADMIN', 'CLINICIAN'];

export function createPractitionersRouter({
  roleMiddleware = requireRole(...allowedRoles),
  handlers = {list}
} = {}) {
  const router = Router();

  router.use(roleMiddleware);
  router.get('/practitioners', asyncHandler(handlers.list));

  return router;
}

export const practitionersRouter = createPractitionersRouter();
