import crypto from 'node:crypto';
import {Router} from 'express';
import {config} from '../../core/config/index.js';
import {requireRole} from '../auth/auth.middleware.js';
import {asyncHandler} from '../../shared/http/async-handler.js';
import {counts, status, sync, syncJobs, testConnection} from './integration.controller.js';

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

integrationRouter.get('/xero/connect', (request, response) => {
  if (!config.xero.enabled) return response.status(503).send('Xero is not configured.');

  const state = crypto.randomBytes(24).toString('hex');
  request.session.xeroState = state;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.xero.clientId,
    redirect_uri: config.xero.redirectUri,
    scope: 'openid profile email offline_access accounting.transactions.read accounting.reports.read',
    state
  });
  response.redirect(`https://login.xero.com/identity/connect/authorize?${params}`);
});

integrationRouter.get('/xero/callback', async (request, response) => {
  if (!request.query.code || request.query.state !== request.session.xeroState) {
    return response.status(400).send('Invalid OAuth callback.');
  }
  response.redirect('/?xero=callback-received');
});
