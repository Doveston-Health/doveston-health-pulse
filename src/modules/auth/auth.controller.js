import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../../core/config/index.js';
import { authenticateUser, AuthenticationError, recordLogout } from './auth.service.js';
import { AUTHENTICATION_ERROR } from './auth.constants.js';
import { getDummyPasswordHash, verifyPassword } from './password.js';

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../public');

function sessionRegenerate(session) {
  return new Promise((resolve, reject) => session.regenerate((error) => error ? reject(error) : resolve()));
}

function sessionSave(session) {
  return new Promise((resolve, reject) => session.save((error) => error ? reject(error) : resolve()));
}

function sessionDestroy(session) {
  return new Promise((resolve, reject) => session.destroy((error) => error ? reject(error) : resolve()));
}

export function getLogin(request, response) {
  if (request.authenticatedUser) return response.redirect(303, '/');
  response.set('Cache-Control', 'no-store');
  response.sendFile(path.join(publicDirectory, 'login.html'));
}

export function getLoginStyles(_request, response) {
  response.sendFile(path.join(publicDirectory, 'login.css'));
}

export function getLoginScript(_request, response) {
  response.sendFile(path.join(publicDirectory, 'login.js'));
}

export function createLoginHandler({
  authenticate = authenticateUser,
  passwordVerifier = verifyPassword,
  dummyHashProvider = getDummyPasswordHash
} = {}) {
  return async function handleLogin(request, response) {
    try {
      const user = await authenticate({
        email: request.body?.email,
        password: request.body?.password,
        verifyPassword: passwordVerifier,
        dummyPasswordHash: await dummyHashProvider()
      });

      await sessionRegenerate(request.session);
      request.session.userId = user.id;
      await sessionSave(request.session);

      if (request.is('application/json')) return response.json({user});
      response.redirect(303, '/');
    } catch (error) {
      if (!(error instanceof AuthenticationError)) throw error;
      if (request.is('application/json')) return response.status(401).json({error: AUTHENTICATION_ERROR, requestId: request.id});
      response.redirect(303, '/login?error=invalid');
    }
  };
}

export const login = createLoginHandler();

export function createLogoutHandler({recordLogoutEvent = recordLogout} = {}) {
  return async function handleLogout(request, response) {
    const userId = request.authenticatedUser.id;
    try {
      await recordLogoutEvent(userId);
    } catch (error) {
      request.log.warn({err: error}, 'logout audit event failed');
    } finally {
      await sessionDestroy(request.session);
    }

    response.clearCookie(config.session.name, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction
    });

    if (request.is('application/json')) return response.status(204).end();
    response.redirect(303, '/login');
  };
}

export const logout = createLogoutHandler();

export function getCurrentUser(request, response) {
  response.set('Cache-Control', 'no-store');
  response.json({user: request.authenticatedUser});
}
