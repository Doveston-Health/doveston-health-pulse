import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config } from './core/config/index.js';
import { apiNotFound, errorHandler } from './core/middleware/error-handler.js';
import { requestLogger } from './core/middleware/request-logger.js';
import { apiRateLimiter, compressionMiddleware, securityHeaders } from './core/middleware/security.js';
import { sessionMiddleware } from './core/session/session-store.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { loadAuthenticatedUser, requireAuthentication } from './modules/auth/auth.middleware.js';
import { integrationRouter } from './modules/integrations/integration.routes.js';
import { operationsRouter } from './modules/operations/operations.routes.js';
import { getHealth } from './modules/system/system.controller.js';
import { systemRouter } from './modules/system/system.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.locals.isReady = false;
app.locals.databaseReady = false;

app.use(requestLogger);
app.use(securityHeaders);
app.use(compressionMiddleware);
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.get('/healthz', getHealth);
app.use('/api', apiRateLimiter, systemRouter);
app.use(sessionMiddleware);
app.use(loadAuthenticatedUser);
app.use(authRouter);
app.use(requireAuthentication);
app.use(express.static(path.resolve(__dirname, '../public'), {index: 'index.html'}));
app.use('/api', apiRateLimiter, operationsRouter);
app.use('/api', apiRateLimiter, integrationRouter);
app.use('/api', apiNotFound);
app.use(errorHandler);
