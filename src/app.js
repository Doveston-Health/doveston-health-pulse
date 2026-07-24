import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import { config } from './core/config/index.js';
import { apiNotFound, errorHandler } from './core/middleware/error-handler.js';
import { requestLogger } from './core/middleware/request-logger.js';
import { apiRateLimiter, compressionMiddleware, securityHeaders } from './core/middleware/security.js';
import { integrationRouter } from './modules/integrations/integration.routes.js';
import { systemRouter } from './modules/system/system.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.locals.isReady = false;

app.use(requestLogger);
app.use(securityHeaders);
app.use(compressionMiddleware);
app.use(express.json());
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction
  }
}));
app.use(express.static(path.resolve(__dirname, '../public')));
app.use('/api', apiRateLimiter, systemRouter, integrationRouter);
app.use('/api', apiNotFound);
app.use(errorHandler);
