import {Router} from 'express';
import {requireRole} from '../auth/auth.middleware.js';
import {asyncHandler} from '../../shared/http/async-handler.js';
import {
  cancellations, forwardBookings, patient, patients, practitioners, rebookingRisk, today, trends
} from './operations.controller.js';

const allowedRoles = ['DIRECTOR', 'PRACTICE_MANAGER', 'ADMIN', 'CLINICIAN'];

export function createOperationsRouter({
  roleMiddleware = requireRole(...allowedRoles),
  handlers = {cancellations, forwardBookings, patient, patients, practitioners, rebookingRisk, today, trends}
} = {}) {
  const router = Router();
  router.use(roleMiddleware);
  router.get('/operations/today', asyncHandler(handlers.today));
  router.get('/operations/forward-bookings', asyncHandler(handlers.forwardBookings));
  router.get('/operations/rebooking-risk', asyncHandler(handlers.rebookingRisk));
  router.get('/operations/cancellations', asyncHandler(handlers.cancellations));
  router.get('/operations/trends', asyncHandler(handlers.trends));
  router.get('/operations/patients/search', asyncHandler(handlers.patients));
  router.get('/operations/patients/:clinikoId', asyncHandler(handlers.patient));
  router.get('/operations/practitioners', asyncHandler(handlers.practitioners));
  return router;
}

export const operationsRouter = createOperationsRouter();
