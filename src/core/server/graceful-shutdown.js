export function registerGracefulShutdown({app, server, logger, timeoutMs, onShutdown = async () => {}}) {
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
    }, timeoutMs);
    forcedShutdown.unref();

    server.close(async (error) => {
      if (error) {
        clearTimeout(forcedShutdown);
        logger.error({err: error, signal}, 'server shutdown failed');
        process.exit(1);
      }

      try {
        await onShutdown();
        clearTimeout(forcedShutdown);
        logger.info({signal}, 'shutdown completed');
        process.exit(0);
      } catch (shutdownError) {
        clearTimeout(forcedShutdown);
        logger.error({err: shutdownError, signal}, 'shutdown cleanup failed');
        process.exit(1);
      }
    });

    server.closeIdleConnections?.();
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  return shutdown;
}
