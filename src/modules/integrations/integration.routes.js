import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../../core/config/index.js';

export const integrationRouter = Router();

const clinikoHeaders = () => ({
  Authorization: `Basic ${Buffer.from(`${config.cliniko.apiKey}:`).toString('base64')}`,
  Accept: 'application/json',
  'User-Agent': config.cliniko.userAgent
});

integrationRouter.get('/cliniko/practitioners', async (_request, response) => {
  if (!config.cliniko.enabled) {
    return response.status(503).json({error: 'Cliniko is not configured. Add CLINIKO_API_KEY to the server environment.'});
  }

  try {
    const clinikoResponse = await fetch('https://api.au4.cliniko.com/v1/practitioners?per_page=100', {headers: clinikoHeaders()});
    if (!clinikoResponse.ok) {
      return response.status(clinikoResponse.status).json({error: 'Cliniko request failed', details: await clinikoResponse.text()});
    }
    response.json(await clinikoResponse.json());
  } catch (error) {
    response.status(500).json({error: 'Cliniko connection error', details: error.message});
  }
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
  // Production: exchange code for tokens, encrypt refresh token at rest, fetch tenant connection, and persist audit metadata.
  response.redirect('/?xero=callback-received');
});
