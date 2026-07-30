import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { getCurrentUser, getLogin, getLoginScript, getLoginStyles, login, logout } from './auth.controller.js';
import { requireAuthentication } from './auth.middleware.js';

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(request, response) {
    if (request.is('application/json')) {
      return response.status(429).json({
        error: 'Too many sign-in attempts. Please try again later.',
        requestId: request.id
      });
    }
    response.redirect(303, '/login?error=rate-limit');
  }
});

export function createAuthRouter({
  loginHandler = login,
  logoutHandler = logout,
  currentUserHandler = getCurrentUser,
  authenticationRequired = requireAuthentication,
  rateLimiter = loginRateLimiter
} = {}) {
  const router = Router();

  router.get('/login', getLogin);
  router.get('/login.css', getLoginStyles);
  router.get('/login.js', getLoginScript);
  router.post('/login', rateLimiter, asyncHandler(loginHandler));
  router.post('/logout', authenticationRequired, asyncHandler(logoutHandler));
  router.get('/api/auth/me', authenticationRequired, currentUserHandler);
  return router;
}

export const authRouter = createAuthRouter();
