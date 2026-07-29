import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { config } from '../config/index.js';
import { databasePool } from '../database/prisma.js';
import { logger } from '../logging/logger.js';

const PostgreSqlSessionStore = connectPgSimple(session);

export const sessionMiddleware = session({
  name: config.session.name,
  store: new PostgreSqlSessionStore({
    pool: databasePool,
    tableName: 'sessions',
    createTableIfMissing: false,
    pruneSessionInterval: 15 * 60,
    ttl: config.session.ttlMs / 1000,
    errorLog(error) {
      logger.error({err: error}, 'session store error');
    }
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: config.session.ttlMs
  }
});
