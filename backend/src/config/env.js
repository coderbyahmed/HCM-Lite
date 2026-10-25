import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const parseMongoDatabaseName = (uri) => {
  if (!uri) return '';

  let parsedUri;
  try {
    parsedUri = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string.');
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsedUri.protocol) || !parsedUri.hostname) {
    throw new Error('MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme and include a host.');
  }

  try {
    return decodeURIComponent(parsedUri.pathname.slice(1));
  } catch {
    throw new Error('MONGODB_URI contains an invalid database name.');
  }
};

const mongodbUri = process.env.MONGODB_URI || '';
const uriDatabaseName = parseMongoDatabaseName(mongodbUri);
const configuredDatabaseName = process.env.MONGODB_DATABASE || '';

if (configuredDatabaseName && uriDatabaseName && configuredDatabaseName !== uriDatabaseName) {
  throw new Error('MONGODB_DATABASE must match the database name in MONGODB_URI.');
}

const port = Number(process.env.PORT || '5000');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
let frontendOrigin;
try {
  const parsedFrontendUrl = new URL(frontendUrl);
  if (
    !['http:', 'https:'].includes(parsedFrontendUrl.protocol) ||
    parsedFrontendUrl.pathname !== '/' ||
    parsedFrontendUrl.search ||
    parsedFrontendUrl.hash
  ) {
    throw new Error();
  }
  frontendOrigin = parsedFrontendUrl.origin;
} catch {
  throw new Error('FRONTEND_URL must be a valid frontend origin without a path.');
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port,
  mongodbUri,
  mongodbDatabaseName: configuredDatabaseName || uriDatabaseName,
  frontendUrl: frontendOrigin,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '2h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  face: {
    encryptionKey: process.env.FACE_ENCRYPTION_KEY || '',
    matchThreshold: Number(process.env.FACE_MATCH_THRESHOLD || '0.48'),
  },
  ai: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-3.8-flash',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || '30000'),
  },
};

export const validateEnvironmentConfig = () => {
  const missingVariables = [];

  if (!config.mongodbUri) missingVariables.push('MONGODB_URI');
  if (!config.mongodbDatabaseName) {
    missingVariables.push('a database name in MONGODB_URI or MONGODB_DATABASE');
  }
  if (!config.jwt.accessSecret) missingVariables.push('JWT_ACCESS_SECRET');
  if (!config.jwt.refreshSecret) missingVariables.push('JWT_REFRESH_SECRET');
  if (!config.face.encryptionKey) missingVariables.push('FACE_ENCRYPTION_KEY');

  if (missingVariables.length) {
    throw new Error(`Missing required backend configuration: ${missingVariables.join(', ')}.`);
  }
  if (config.jwt.accessSecret.length < 32 || config.jwt.refreshSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each contain at least 32 characters.');
  }
  if (config.jwt.accessSecret === config.jwt.refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must use different values.');
  }
  if (!/^[\da-f]{64}$/i.test(config.face.encryptionKey)) {
    throw new Error('FACE_ENCRYPTION_KEY must be a 32-byte hexadecimal key (64 hex characters).');
  }
  if (
    !Number.isFinite(config.face.matchThreshold) ||
    config.face.matchThreshold < 0.35 ||
    config.face.matchThreshold > 0.6
  ) {
    throw new Error('FACE_MATCH_THRESHOLD must be a number between 0.35 and 0.6.');
  }
  if (!Number.isInteger(config.ai.timeoutMs) || config.ai.timeoutMs < 1) {
    throw new Error('AI_TIMEOUT_MS must be a positive integer.');
  }
};
