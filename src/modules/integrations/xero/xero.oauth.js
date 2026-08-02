import crypto from 'node:crypto';
import {config} from '../../../core/config/index.js';
import {AppError} from '../../../shared/errors/app-error.js';

export const XERO_SCOPES = Object.freeze(['offline_access','accounting.settings.read','accounting.contacts.read','accounting.invoices.read','accounting.payments.read','accounting.banktransactions.read','accounting.reports.profitandloss.read','accounting.reports.balancesheet.read','accounting.reports.aged.read']);
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function createAuthorization(request, {now = Date.now(), randomBytes = crypto.randomBytes} = {}) {
  if (!config.xero.enabled) throw new AppError('Xero is not configured.', 503);
  const state = randomBytes(32).toString('base64url');
  request.session.xeroOAuth = {stateHash: crypto.createHash('sha256').update(state).digest('hex'), expiresAt: now + OAUTH_STATE_TTL_MS};
  const url = new URL(config.xero.authBaseUrl);
  url.search = new URLSearchParams({response_type:'code',client_id:config.xero.clientId,redirect_uri:config.xero.redirectUri,scope:XERO_SCOPES.join(' '),state}).toString();
  return url.toString();
}

export function consumeOAuthState(request, supplied, {now = Date.now()} = {}) {
  const stored = request.session.xeroOAuth;
  delete request.session.xeroOAuth;
  if (!stored || !supplied || stored.expiresAt < now) throw new AppError('The Xero authorization request is missing or expired.', 400);
  const actual = crypto.createHash('sha256').update(supplied).digest();
  const expected = Buffer.from(stored.stateHash, 'hex');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new AppError('The Xero authorization state is invalid.', 400);
}

export async function exchangeCode(code, {fetchImpl = fetch} = {}) {
  const response = await fetchImpl(config.xero.tokenUrl,{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${config.xero.clientId}:${config.xero.clientSecret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:config.xero.redirectUri}),signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new AppError('Xero authorization could not be completed.', 502);
  const token = await response.json().catch(()=>null);
  if (!token?.access_token || !token?.refresh_token || !token?.expires_in) throw new AppError('Xero returned an invalid token response.', 502);
  return token;
}
