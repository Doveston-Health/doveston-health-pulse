import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { getCurrentUser, getLogin, getLoginScript, getLoginStyles, login, logout } from './auth.controller.js';
import { requireAuthentication } from './auth.middleware.js';

export const authRouter = Router();

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

authRouter.get('/login', getLogin);
authRouter.get('/login.css', getLoginStyles);
authRouter.get('/login.js', getLoginScript);
authRouter.post('/login', loginRateLimiter, asyncHandler(login));
authRouter.post('/logout', requireAuthentication, asyncHandler(logout));
authRouter.get('/api/auth/me', requireAuthentication, getCurrentUser);
