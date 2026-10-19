/**
 * Test environment. Loads the backend .env, then points Prisma at the
 * dedicated test database so e2e runs never touch development data.
 */
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '..', '.env') });

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://bdu:bdu_store_dev_pw@127.0.0.1:5542/bdu_store_test?schema=public';

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'e2e-test-secret';
process.env.JWT_EXPIRATION = '1h';
