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
        if (!origin || config.frontendUrls.includes(origin)) {
          return callback(null, true);
        }

        const error = new Error('Request origin is not allowed by backend CORS configuration.');
        error.statusCode = 403;
        return callback(error);
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

  app.get('/', (req, res) => {
    res.json({
      service: 'HCM Lite API',
      health: '/api/health',
    });
  });

  // API router
  app.use('/api', apiRouter);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

const app = createApp();

export default app;
