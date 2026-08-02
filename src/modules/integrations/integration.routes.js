import {Router} from 'express';
import {requireRole} from '../auth/auth.middleware.js';
import {asyncHandler} from '../../shared/http/async-handler.js';
import {counts, status, sync, syncJobs, testConnection} from './integration.controller.js';
import {xeroRouter} from './xero/xero.routes.js';

export const integrationRouter = Router();
const manageCliniko = requireRole('DIRECTOR', 'PRACTICE_MANAGER');

integrationRouter.post('/integrations/cliniko/test-connection', manageCliniko, asyncHandler(testConnection));
integrationRouter.post('/integrations/cliniko/sync', manageCliniko, asyncHandler(sync));
integrationRouter.get('/integrations/cliniko/status', manageCliniko, asyncHandler(status));
integrationRouter.get('/integrations/cliniko/sync-jobs', manageCliniko, asyncHandler(syncJobs));
integrationRouter.get('/integrations/cliniko/counts', manageCliniko, asyncHandler(counts));

integrationRouter.get('/cliniko/practitioners', manageCliniko, (_request, response) => {
  response.status(410).json({
    error: 'The raw Cliniko practitioners proxy has been removed. Use the governed Cliniko integration status routes.',
    provider: 'CLINIKO'
  });
});
integrationRouter.use(xeroRouter);
