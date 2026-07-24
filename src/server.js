import { app } from './app.js';
import { config } from './core/config/index.js';
import { logger } from './core/logging/logger.js';
import { registerGracefulShutdown } from './core/server/graceful-shutdown.js';

const server = app.listen(config.port, () => {
  app.locals.isReady = true;
  logger.info({port: config.port}, 'server started');
});

registerGracefulShutdown({
  app,
  server,
  logger,
  timeoutMs: config.http.shutdownTimeoutMs
});
