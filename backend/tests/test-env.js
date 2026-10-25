import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

process.env.JWT_ACCESS_SECRET = 'hcm-lite-test-only-access-secret';
process.env.JWT_REFRESH_SECRET = 'hcm-lite-test-only-refresh-secret';
process.env.FACE_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.FACE_MATCH_THRESHOLD = '0.48';

if (process.env.MONGODB_TEST_URI) {
  const testUri = new URL(process.env.MONGODB_TEST_URI);
  testUri.pathname = `/hcm_test_${randomBytes(12).toString('hex')}`;
  process.env.MONGODB_URI = testUri.toString();
  delete process.env.MONGODB_DATABASE;
  process.env.NODE_ENV = 'development';
} else {
  process.env.NODE_ENV = 'test';
}
