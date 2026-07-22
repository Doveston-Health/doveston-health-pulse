import compression from 'compression';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';

export const compressionMiddleware = compression();

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      upgradeInsecureRequests: config.isProduction ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false
});

export const apiRateLimiter = rateLimit({
  windowMs: config.http.rateLimit.windowMs,
  limit: config.http.rateLimit.limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(request, response) {
    response.status(429).json({
      error: 'Too many requests. Please try again later.',
      requestId: request.id
    });
  }
});
