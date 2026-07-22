import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import { config } from './config.js';
import { apiNotFound, errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRateLimiter, compressionMiddleware, securityHeaders } from './middleware/security.js';
import { apiRouter } from './routes/api.js';

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
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRateLimiter, apiRouter);
app.use('/api', apiNotFound);
app.use(errorHandler);
