import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './database/db.js';
import { config, validateEnvironmentConfig } from './config/env.js';

let httpServer;
let startupPromise;
let shuttingDown = false;

const shutdown = async (reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  console.info(`[INFO] Shutting down backend (${reason}).`);

  try {
    if (httpServer?.listening) {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  } catch (error) {
    process.exitCode = 1;
    console.error(`[ERROR] HTTP server shutdown failed (${error.name || 'Error'}).`);
  }

  try {
    await disconnectDatabase();
  } catch (error) {
    process.exitCode = 1;
    console.error(`[ERROR] MongoDB shutdown failed (${error.name || 'Error'}).`);
  }

  console.info('[INFO] Backend shutdown complete.');
};

const startServer = () => {
  if (startupPromise) return startupPromise;

  startupPromise = (async () => {
    console.info('[INFO] Starting backend...');
    validateEnvironmentConfig();
    console.info('[INFO] Environment configuration validated.');

    await connectDatabase();

    const app = createApp();
    httpServer = app.listen(config.port);
    httpServer.on('error', (error) => {
      if (httpServer.listening) {
        console.error(`[ERROR] HTTP server error (${error.name || 'Error'}).`);
        void shutdown('HTTP server error', 1);
      }
    });

    await new Promise((resolve, reject) => {
      httpServer.once('listening', resolve);
      httpServer.once('error', reject);
    });

    const address = httpServer.address();
    const port = typeof address === 'object' && address ? address.port : config.port;
    console.info(`[INFO] Backend server running on port ${port} (${config.env}).`);
    return httpServer;
  })();

  return startupPromise;
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  const errorName = reason instanceof Error ? reason.name : 'Unknown';
  console.error(`[ERROR] Unhandled promise rejection (${errorName}).`);
  void shutdown('unhandled promise rejection', 1);
});
process.on('uncaughtException', (error) => {
  console.error(`[ERROR] Uncaught exception (${error.name || 'Error'}).`);
  void shutdown('uncaught exception', 1);
});

startServer().catch(async (error) => {
  console.error(`[ERROR] Backend startup failed: ${error.message || 'Unexpected error.'}`);
  process.exitCode = 1;
  try {
    await disconnectDatabase();
  } catch (shutdownError) {
    console.error(`[ERROR] MongoDB cleanup failed (${shutdownError.name || 'Error'}).`);
  }
});
