/**
 * Jest global setup for e2e tests:
 *   1. create the test database if it does not exist,
 *   2. apply every migration to it.
 *
 * Runs once per `npm run test:e2e`, so the suite always starts from the real
 * schema rather than a hand-maintained copy of it.
 */
import { execFileSync } from 'child_process';
import { config } from 'dotenv';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

export default async function globalSetup(): Promise<void> {
  config({ path: join(__dirname, '..', '.env') });

  const testUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://bdu:bdu_store_dev_pw@127.0.0.1:5542/bdu_store_test?schema=public';

  const databaseName = new URL(testUrl).pathname.replace(/^\//, '');
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres';

  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const existing = await admin.$queryRawUnsafe<Array<{ datname: string }>>(
      'SELECT datname FROM pg_database WHERE datname = $1',
      databaseName,
    );
    if (existing.length === 0) {
      // Identifiers cannot be parameterised; the name comes from our own env.
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      console.log(`Created test database "${databaseName}".`);
    }
  } finally {
    await admin.$disconnect();
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'pipe',
  });
}
