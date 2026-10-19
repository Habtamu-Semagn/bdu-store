/**
 * Seeds the administrator account and, optionally, demo data.
 *
 * The administrator is created only from environment variables so no public
 * administrator registration exists. Run with:
 *
 *   npm run prisma:seed
 *
 * Environment (all optional except ADMIN_UNIVERSITY_ID / ADMIN_PASSWORD):
 *   ADMIN_FULL_NAME        default: "BDU Store Administrator"
 *   ADMIN_UNIVERSITY_ID    default: "bdu0000001" — required in production
 *   ADMIN_PASSWORD         required in production, min 8 characters
 *   SEED_DEMO_DATA         "true" to also create demo users/devices
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Trims and lower-cases the administrator's university ID. No format is
 * enforced, so the administrator can use whatever ID the university issues.
 */
function normalizeUniversityId(raw: string): string {
  return raw.trim().toLowerCase();
}

async function seedAdministrator(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  const universityIdRaw = process.env.ADMIN_UNIVERSITY_ID;
  const password = process.env.ADMIN_PASSWORD;

  if (isProduction && (!universityIdRaw || !password)) {
    throw new Error(
      'ADMIN_UNIVERSITY_ID and ADMIN_PASSWORD must be set when seeding in production.',
    );
  }
  if (password && password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');
  }

  const universityId = normalizeUniversityId(universityIdRaw ?? 'bdu0000001');
  const passwordHash = await argon2.hash(password ?? 'Admin12345');

  const existing = await prisma.user.findUnique({ where: { universityId } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      const promoted = await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN' },
      });
      console.log(`Promoted existing user to ADMIN: ${promoted.fullName} (${promoted.universityId})`);
      return;
    }
    console.log(`Administrator already exists: ${existing.fullName} (${existing.universityId})`);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      fullName: process.env.ADMIN_FULL_NAME ?? 'BDU Store Administrator',
      universityId,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Administrator created: ${admin.fullName} — login university ID ${admin.universityId}`);
  if (!isProduction && !process.env.ADMIN_PASSWORD) {
    console.log('Using the default development password "Admin12345". Set ADMIN_PASSWORD to change it.');
  }
}

async function seedDemoData(): Promise<void> {
  const demoUsers = [
    { fullName: 'Hanna Tesfaye', universityId: 'bdu9110001' },
    { fullName: 'Dawit Alemu', universityId: 'bdu9110002' },
  ];

  const passwordHash = await argon2.hash('Demo12345');

  for (const demo of demoUsers) {
    await prisma.user.upsert({
      where: { universityId: demo.universityId },
      update: {},
      create: { ...demo, passwordHash, role: 'USER' },
    });
  }

  const hanna = await prisma.user.findUniqueOrThrow({
    where: { universityId: 'bdu9110001' },
  });
  const dawit = await prisma.user.findUniqueOrThrow({
    where: { universityId: 'bdu9110002' },
  });

  // A device awaiting a storage decision.
  const pendingCount = await prisma.device.count({
    where: { userId: hanna.id, storageStatus: 'PENDING' },
  });
  if (pendingCount === 0) {
    await prisma.device.create({
      data: {
        userId: hanna.id,
        productType: 'TABLET',
        productName: 'iPad Air 5',
        brand: 'Apple',
        model: 'A2588',
        serialNumber: 'DM-DEMO-IPAD-001',
        description: 'Demo storage request awaiting review.',
        storageStatus: 'PENDING',
      },
    });
  }

  // A device already stored, so the release flow can be exercised immediately.
  const storedDevice = await prisma.device.findFirst({
    where: { userId: dawit.id, storageStatus: 'STORED' },
  });
  if (!storedDevice) {
    await prisma.device.create({
      data: {
        userId: dawit.id,
        productType: 'LAPTOP',
        productName: 'ThinkPad T14',
        brand: 'Lenovo',
        model: 'T14 Gen 3',
        serialNumber: 'DM-DEMO-LAP-001',
        description: 'Demo device already in storage.',
        storageStatus: 'STORED',
        storageToken: 'BDU-DEMO-0000-0000-0000-0000',
        storageApprovedAt: new Date(),
      },
    });
  }

  console.log('Demo data ready (2 users, one PENDING device, one STORED device).');
  console.log('Demo user logins: bdu9110001 / Demo12345 and bdu9110002 / Demo12345');
}

async function main(): Promise<void> {
  await seedAdministrator();
  if (process.env.SEED_DEMO_DATA === 'true') {
    await seedDemoData();
  } else {
    console.log('Skipping demo data (set SEED_DEMO_DATA=true to include it).');
  }
}

main()
  .then(async () => {
    console.log('Seed completed.');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
