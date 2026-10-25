import mongoose from 'mongoose';
import { config, validateEnvironmentConfig } from '../config/env.js';

let connectionPromise;
let hasConnected = false;
let intentionalDisconnect = false;

mongoose.connection.on('disconnected', () => {
  if (hasConnected && !intentionalDisconnect && config.env !== 'test') {
    console.warn('[WARN] MongoDB connection was lost.');
  }
});

mongoose.connection.on('error', (error) => {
  if (hasConnected && !intentionalDisconnect) {
    console.error(`[ERROR] MongoDB connection error (${error.name || 'Error'}).`);
  }
});

export const connectDatabase = async () => {
  validateEnvironmentConfig();

  if (mongoose.connection.readyState === 1) return true;
  if (connectionPromise) return connectionPromise;

  console.info('[INFO] Connecting to MongoDB...');
  connectionPromise = mongoose.connect(config.mongodbUri, {
    dbName: config.mongodbDatabaseName,
    serverSelectionTimeoutMS: 10000,
  })
    .then(() => {
      hasConnected = true;
      console.info('[INFO] MongoDB connected successfully.');
      return true;
    })
    .catch(() => {
      throw new Error('MongoDB connection failed. Verify MONGODB_URI, network access, and database credentials.');
    })
    .finally(() => {
      connectionPromise = undefined;
    });

  return connectionPromise;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    intentionalDisconnect = true;
    try {
      await mongoose.disconnect();
    } finally {
      intentionalDisconnect = false;
    }
  }
};

export const getDbStatus = () => {
  if (config.env === 'test') {
    return {
      connected: true,
      type: 'Isolated in-memory test adapter',
      database: null,
    };
  }

  return {
    connected: mongoose.connection.readyState === 1,
    type: 'MongoDB (Mongoose)',
    database: mongoose.connection.readyState === 1
      ? mongoose.connection.name
      : config.mongodbDatabaseName || null,
  };
};
