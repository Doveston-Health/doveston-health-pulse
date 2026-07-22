import { app } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';

const server = app.listen(config.port, () => {
  app.locals.isReady = true;
  logger.info({port: config.port}, 'server started');
});

let shutdownStarted = false;

function shutdown(signal) {
  if (shutdownStarted) return;
  shutdownStarted = true;
  app.locals.isReady = false;
  logger.info({signal}, 'shutdown started');

  const forcedShutdown = setTimeout(() => {
    logger.error({signal}, 'graceful shutdown timed out');
    server.closeAllConnections?.();
    process.exit(1);
  }, config.http.shutdownTimeoutMs);
  forcedShutdown.unref();

  server.close((error) => {
    clearTimeout(forcedShutdown);
    if (error) {
      logger.error({err: error, signal}, 'server shutdown failed');
      process.exit(1);
    }

    logger.info({signal}, 'shutdown completed');
    process.exit(0);
  });

  server.closeIdleConnections?.();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
