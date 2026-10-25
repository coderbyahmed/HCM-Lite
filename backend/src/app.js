import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { config } from './config/env.js';
import { connectDatabase } from './database/db.js';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, !origin || config.frontendUrls.includes(origin));
      },
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(async (req, res, next) => {
    if (config.env === 'test') return next();

    try {
      await connectDatabase();
      next();
    } catch (error) {
      next(error);
    }
  });

  // API router
  app.use('/api', apiRouter);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

const app = createApp();

export default app;
