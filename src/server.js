import { app } from './app.js';
import { config } from './core/config/index.js';
import { disconnectDatabase } from './core/database/disconnect-database.js';
import { connectDatabase } from './core/database/prisma.js';
import { logger } from './core/logging/logger.js';
import { registerGracefulShutdown } from './core/server/graceful-shutdown.js';

app.locals.databaseReady = await connectDatabase();

const server = app.listen(config.port, () => {
  app.locals.isReady = true;
  logger.info({port: config.port}, 'server started');
});

registerGracefulShutdown({
  app,
  server,
  logger,
  timeoutMs: config.http.shutdownTimeoutMs,
  onShutdown: disconnectDatabase
});
