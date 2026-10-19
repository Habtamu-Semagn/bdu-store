/**
 * End-to-end tests for the BDU Store API.
 *
 * These boot the real Nest application, connect to the dedicated test
 * database (created and migrated by test/global-setup.ts) and drive it over
 * HTTP with cookies, exactly as a browser would.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.service';

const ADMIN_UNIVERSITY_ID = 'bdu0000001';
const ADMIN_PASSWORD = 'Admin12345';
const PASSWORD = 'Secret123';

interface ApiBody<T = Record<string, unknown>> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Array<{ field: string; messages: string[] }>;
}

/**
 * The cookie-preserving agent returned by `request.agent()`. Derived rather
 * than annotated, because @types/supertest's `SuperAgentTest` alias does not
 * exactly match its own `agent()` return type.
 */
type Agent = ReturnType<typeof request.agent>;

/** Valid university IDs, unique per call. */
let uniCounter = 1_500_000;
function nextUniversityId(): string {
  uniCounter += 1;
  return `bdu${uniCounter}`;
}

let serialCounter = 0;
function nextSerial(): string {
  serialCounter += 1;
  return `E2E-SN-${serialCounter}`;
}

describe('BDU Store API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: unknown;
  let adminToken: string;
  let adminId: string;

  const body = <T,>(response: request.Response): T =>
    (response.body as ApiBody<T>).data;

  const registerUser = (
    agent: Agent,
    universityId = nextUniversityId(),
  ) =>
    agent.post('/api/auth/register').send({
      fullName: 'E2E Campus User',
      universityId,
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });

  /** Registers and logs in a fresh campus user; returns the agent and ids. */
  async function newCampusUser() {
    const agent = request.agent(server as never);
    const universityId = nextUniversityId();
    const registration = await registerUser(agent, universityId);
    expect(registration.status).toBe(201);
    const created = body<{ id: string; universityId: string }>(registration);

    const login = await agent
      .post('/api/auth/login')
      .send({ universityId, password: PASSWORD });
    expect(login.status).toBe(200);

    return {
      agent,
      universityId,
      id: created.id,
      token: body<{ token: string }>(login).token,
    };
  }

  async function createDevice(
    agent: Agent,
    overrides: Record<string, unknown> = {},
  ) {
    const response = await agent.post('/api/devices').send({
      productType: 'LAPTOP',
      productName: 'E2E Laptop',
      serialNumber: nextSerial(),
      ...overrides,
    });
    expect(response.status).toBe(201);
    return body<{ id: string; storageStatus: string; storageToken: string | null }>(
      response,
    );
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    server = app.getHttpServer();

    // Safety net: never wipe a development database by accident.
    const [{ current_database: database }] = await prisma.$queryRawUnsafe<
      Array<{ current_database: string }>
    >('SELECT current_database() AS current_database');
    if (!database.endsWith('_test')) {
      throw new Error(
        `E2E tests must run against a *_test database, but are connected to "${database}".`,
      );
    }

    await prisma.releaseRequest.deleteMany();
    await prisma.device.deleteMany();
    await prisma.user.deleteMany();

    const admin = await prisma.user.create({
      data: {
        fullName: 'E2E Store Administrator',
        universityId: ADMIN_UNIVERSITY_ID,
        passwordHash: await argon2.hash(ADMIN_PASSWORD),
        role: 'ADMIN',
      },
    });
    adminId = admin.id;

    const login = await request(server as never)
      .post('/api/auth/login')
      .send({ universityId: ADMIN_UNIVERSITY_ID, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    adminToken = body<{ token: string }>(login).token;
  });

  afterAll(async () => {
    await app?.close();
  });

  // ---------------------------------------------------------------- auth ---

  describe('registration and login with university IDs', () => {
    it('registers a campus user and never returns a password hash', async () => {
      const agent = request.agent(server as never);
      const universityId = nextUniversityId();
      const response = await registerUser(agent, universityId);

      expect(response.status).toBe(201);
      const created = body<Record<string, unknown>>(response);
      expect(created.universityId).toBe(universityId);
      expect(created.role).toBe('USER');
      expect(created).not.toHaveProperty('passwordHash');
      expect(created).not.toHaveProperty('password');
      expect(created).not.toHaveProperty('email');
      expect(created).not.toHaveProperty('phoneNumber');
    });

    it('rejects a duplicate university ID', async () => {
      const agent = request.agent(server as never);
      const universityId = nextUniversityId();
      expect((await registerUser(agent, universityId)).status).toBe(201);

      const duplicate = await registerUser(agent, universityId);
      expect(duplicate.status).toBe(409);
      expect(String(duplicate.body.message)).toMatch(/university ID/i);
    });

    it('rejects mismatched passwords', async () => {
      const agent = request.agent(server as never);
      const response = await agent.post('/api/auth/register').send({
        fullName: 'Mismatch User',
        universityId: nextUniversityId(),
        password: PASSWORD,
        confirmPassword: 'Different123',
      });

      expect(response.status).toBe(422);
      expect((response.body as ApiBody).errors?.map((e) => e.field)).toContain(
        'confirmPassword',
      );
    });

    it('rejects an email field, because the system has no email', async () => {
      const agent = request.agent(server as never);
      const response = await agent.post('/api/auth/register').send({
        fullName: 'Email User',
        universityId: nextUniversityId(),
        email: 'someone@example.com',
        password: PASSWORD,
        confirmPassword: PASSWORD,
      });

      expect(response.status).toBe(422);
    });

    it('rejects a wrong password without revealing which field was wrong', async () => {
      const agent = request.agent(server as never);
      const universityId = nextUniversityId();
      await registerUser(agent, universityId);

      const response = await request(server as never)
        .post('/api/auth/login')
        .send({ universityId, password: 'WrongPass1' });
      expect(response.status).toBe(401);
      expect(String(response.body.message)).toMatch(/university ID or password/i);
    });

    it('rejects an unknown university ID with the same message', async () => {
      const response = await request(server as never)
        .post('/api/auth/login')
        .send({ universityId: nextUniversityId(), password: PASSWORD });
      expect(response.status).toBe(401);
      expect(String(response.body.message)).toMatch(/university ID or password/i);
    });

    it('exposes the session through GET /auth/me and clears it on logout', async () => {
      const { agent, id } = await newCampusUser();

      const me = await agent.get('/api/auth/me');
      expect(me.status).toBe(200);
      expect(body<{ id: string }>(me).id).toBe(id);

      expect((await agent.post('/api/auth/logout')).status).toBe(200);
      expect((await agent.get('/api/auth/me')).status).toBe(401);
    });
  });

  // ------------------------------------------------------------ guarding ---

  describe('protected routes and role authorisation', () => {
    it('rejects unauthenticated access to private routes', async () => {
      expect((await request(server as never).get('/api/devices/my')).status).toBe(401);
      expect((await request(server as never).get('/api/auth/me')).status).toBe(401);
      expect(
        (await request(server as never).get('/api/admin/storage-requests')).status,
      ).toBe(401);
      expect(
        (
          await request(server as never)
            .post('/api/devices')
            .send({ productType: 'LAPTOP', productName: 'Anon', serialNumber: 'X' })
        ).status,
      ).toBe(401);
    });

    it('forbids a campus user from every administrator endpoint', async () => {
      const { agent, token } = await newCampusUser();
      const device = await createDevice(agent);

      const attempts: Array<() => request.Test> = [
        () => agent.get('/api/admin/storage-requests'),
        () => agent.get('/api/admin/devices/stored'),
        () => agent.get('/api/admin/release-requests'),
        () => agent.patch(`/api/admin/devices/${device.id}/approve-storage`),
        () =>
          agent
            .patch(`/api/admin/devices/${device.id}/reject-storage`)
            .send({ rejectionReason: 'Nope' }),
        () =>
          agent.patch(
            '/api/admin/release-requests/00000000-0000-0000-0000-000000000000/approve',
          ),
        () =>
          agent
            .patch(
              '/api/admin/release-requests/00000000-0000-0000-0000-000000000000/reject',
            )
            .send({ rejectionReason: 'Nope' }),
      ];

      // Built one at a time: supertest binds the server per request.
      for (const attempt of attempts) {
        expect((await attempt()).status).toBe(403);
      }

      // A forged role in the token payload must not help: the role is re-read
      // from the database on every request.
      const forged = Buffer.from(
        JSON.stringify({ sub: 'whatever', role: 'ADMIN' }),
      ).toString('base64url');
      const response = await request(server as never)
        .get('/api/admin/storage-requests')
        .set('Authorization', `Bearer ${forged}.${forged}.${forged}`);
      expect(response.status).toBe(401);

      expect(token).toBeTruthy();
    });

    it('allows an administrator through', async () => {
      const response = await request(server as never)
        .get('/api/admin/storage-requests')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe('device ownership enforcement', () => {
    it('hides one user’s device from another', async () => {
      const owner = await newCampusUser();
      const stranger = await newCampusUser();
      const device = await createDevice(owner.agent);

      expect((await owner.agent.get(`/api/devices/${device.id}`)).status).toBe(200);
      expect((await stranger.agent.get(`/api/devices/${device.id}`)).status).toBe(403);
      expect(
        (await stranger.agent.post(`/api/devices/${device.id}/release-requests`))
          .status,
      ).toBe(403);
    });

    it('lists only the caller’s own devices', async () => {
      const owner = await newCampusUser();
      const stranger = await newCampusUser();
      const device = await createDevice(owner.agent, { productName: 'Private Laptop' });

      const strangerList = body<Array<{ id: string }>>(
        await stranger.agent.get('/api/devices/my'),
      );
      expect(strangerList.map((d) => d.id)).not.toContain(device.id);

      const ownerList = body<Array<{ id: string }>>(
        await owner.agent.get('/api/devices/my'),
      );
      expect(ownerList.map((d) => d.id)).toContain(device.id);
    });

    it('lets an administrator inspect any device', async () => {
      const owner = await newCampusUser();
      const device = await createDevice(owner.agent);

      const response = await request(server as never)
        .get(`/api/devices/${device.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
    });

    it('returns 404 for a device that does not exist', async () => {
      const { agent } = await newCampusUser();
      const response = await agent.get(
        '/api/devices/00000000-0000-0000-0000-000000000000',
      );
      expect(response.status).toBe(404);
    });
  });

  // ------------------------------------------------------------- storage ---

  describe('device registration rules', () => {
    it('starts every request as PENDING with no token', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent, {
        productType: 'TABLET',
        productName: 'E2E Tablet',
      });

      expect(device.storageStatus).toBe('PENDING');
      expect(device.storageToken).toBeNull();
    });

    it('requires a serial number for computers, laptops, phones and tablets', async () => {
      const { agent } = await newCampusUser();

      for (const productType of [
        'DESKTOP_COMPUTER',
        'LAPTOP',
        'MOBILE_PHONE',
        'TABLET',
      ]) {
        const response = await agent
          .post('/api/devices')
          .send({ productType, productName: 'No serial' });
        expect(response.status).toBe(422);
        expect(
          (response.body as ApiBody).errors?.map((e) => e.field),
        ).toContain('serialNumber');
      }
    });

    it('makes the serial number optional for OTHER devices', async () => {
      const { agent } = await newCampusUser();
      const response = await agent
        .post('/api/devices')
        .send({ productType: 'OTHER', productName: 'Desk lamp' });
      expect(response.status).toBe(201);
    });

    it('rejects an unknown product type and a missing product name', async () => {
      const { agent } = await newCampusUser();
      expect(
        (
          await agent
            .post('/api/devices')
            .send({ productType: 'TOASTER', productName: 'Nope' })
        ).status,
      ).toBe(422);
      expect(
        (await agent.post('/api/devices').send({ productType: 'LAPTOP' })).status,
      ).toBe(422);
    });
  });

  describe('storage approval and token generation', () => {
    it('moves a pending device to STORED and issues a unique token', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);

      const response = await request(server as never)
        .patch(`/api/admin/devices/${device.id}/approve-storage`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const approved = body<{
        storageStatus: string;
        storageToken: string;
        storageApprovedAt: string;
        storageApprovedBy: string;
      }>(response);

      expect(approved.storageStatus).toBe('STORED');
      expect(approved.storageToken).toMatch(/^BDU-[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/);
      expect(approved.storageApprovedAt).toBeTruthy();
      expect(approved.storageApprovedBy).toBe(adminId);

      const stored = await prisma.device.findUniqueOrThrow({
        where: { id: device.id },
      });
      expect(stored.storageStatus).toBe('STORED');
      expect(stored.storageToken).toBe(approved.storageToken);
      expect(stored.storageApprovedBy).toBe(adminId);
      expect(stored.storageApprovedAt).toBeInstanceOf(Date);
    });

    it('issues a different token for every device', async () => {
      const { agent } = await newCampusUser();
      const tokens: string[] = [];

      for (let i = 0; i < 5; i += 1) {
        const device = await createDevice(agent, {
          productName: `Batch device ${i}`,
        });
        const response = await request(server as never)
          .patch(`/api/admin/devices/${device.id}/approve-storage`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
        tokens.push(body<{ storageToken: string }>(response).storageToken);
      }

      expect(new Set(tokens).size).toBe(tokens.length);
      expect(await prisma.device.count({ where: { storageToken: { in: tokens } } })).toBe(
        tokens.length,
      );
    });

    it('refuses to decide the same request twice', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      const path = `/api/admin/devices/${device.id}/approve-storage`;

      expect(
        (
          await request(server as never)
            .patch(path)
            .set('Authorization', `Bearer ${adminToken}`)
        ).status,
      ).toBe(200);
      expect(
        (
          await request(server as never)
            .patch(path)
            .set('Authorization', `Bearer ${adminToken}`)
        ).status,
      ).toBe(409);
    });

    it('prevents two simultaneous approvals from both succeeding', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      const path = `/api/admin/devices/${device.id}/approve-storage`;

      const [first, second] = await Promise.all([
        request(server as never)
          .patch(path)
          .set('Authorization', `Bearer ${adminToken}`),
        request(server as never)
          .patch(path)
          .set('Authorization', `Bearer ${adminToken}`),
      ]);

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([200, 409]);

      const stored = await prisma.device.findUniqueOrThrow({
        where: { id: device.id },
      });
      expect(stored.storageStatus).toBe('STORED');
      expect(stored.storageToken).not.toBeNull();
    });

    it('returns 404 when approving a device that does not exist', async () => {
      const response = await request(server as never)
        .patch('/api/admin/devices/00000000-0000-0000-0000-000000000000/approve-storage')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(404);
    });
  });

  describe('storage rejection', () => {
    it('requires a reason', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);

      const missing = await request(server as never)
        .patch(`/api/admin/devices/${device.id}/reject-storage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(missing.status).toBe(422);

      const blank = await request(server as never)
        .patch(`/api/admin/devices/${device.id}/reject-storage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: '' });
      expect(blank.status).toBe(422);
    });

    it('marks the device REJECTED, records the reason and issues no token', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      const reason = 'Device was never handed in at the counter.';

      const response = await request(server as never)
        .patch(`/api/admin/devices/${device.id}/reject-storage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: reason });

      expect(response.status).toBe(200);
      const rejected = body<{
        storageStatus: string;
        storageToken: string | null;
        storageRejectionReason: string;
        storageRejectedBy: string;
      }>(response);

      expect(rejected.storageStatus).toBe('REJECTED');
      expect(rejected.storageToken).toBeNull();
      expect(rejected.storageRejectionReason).toBe(reason);
      expect(rejected.storageRejectedBy).toBe(adminId);
    });

    it('shows the rejection reason to the device owner', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      const reason = 'Serial number does not match the device presented.';

      await request(server as never)
        .patch(`/api/admin/devices/${device.id}/reject-storage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: reason });

      const list = body<Array<{ id: string; storageRejectionReason: string | null }>>(
        await agent.get('/api/devices/my'),
      );
      expect(list.find((d) => d.id === device.id)?.storageRejectionReason).toBe(
        reason,
      );
    });
  });

  // ------------------------------------------------------------- release ---

  describe('release request eligibility', () => {
    it('refuses release for a device that is not stored', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);

      const response = await agent.post(
        `/api/devices/${device.id}/release-requests`,
      );
      expect(response.status).toBe(409);
    });

    it('allows the owner of a stored device to request release', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      await request(server as never)
        .patch(`/api/admin/devices/${device.id}/approve-storage`)
        .set('Authorization', `Bearer ${adminToken}`);

      const response = await agent.post(`/api/devices/${device.id}/release-requests`);
      expect(response.status).toBe(201);
      const created = body<{ id: string; status: string }>(response);
      expect(created.status).toBe('PENDING');

      const persisted = await prisma.releaseRequest.findUniqueOrThrow({
        where: { id: created.id },
      });
      expect(persisted.status).toBe('PENDING');
      expect(persisted.deviceId).toBe(device.id);
      expect(persisted.requestedAt).toBeInstanceOf(Date);
    });

    it('refuses a second pending request for the same device', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      await request(server as never)
        .patch(`/api/admin/devices/${device.id}/approve-storage`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(
        (await agent.post(`/api/devices/${device.id}/release-requests`)).status,
      ).toBe(201);
      expect(
        (await agent.post(`/api/devices/${device.id}/release-requests`)).status,
      ).toBe(409);
    });

    it('lets only one of two simultaneous requests win', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      await request(server as never)
        .patch(`/api/admin/devices/${device.id}/approve-storage`)
        .set('Authorization', `Bearer ${adminToken}`);

      const [first, second] = await Promise.all([
        agent.post(`/api/devices/${device.id}/release-requests`),
        agent.post(`/api/devices/${device.id}/release-requests`),
      ]);

      expect([first.status, second.status].sort()).toEqual([201, 409]);
      expect(
        await prisma.releaseRequest.count({
          where: { deviceId: device.id, status: 'PENDING' },
        }),
      ).toBe(1);
    });
  });

  describe('administrator release decisions', () => {
    async function storedDeviceWithRequest() {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      await request(server as never)
        .patch(`/api/admin/devices/${device.id}/approve-storage`)
        .set('Authorization', `Bearer ${adminToken}`);
      const releaseRequest = body<{ id: string }>(
        await agent.post(`/api/devices/${device.id}/release-requests`),
      );
      return { agent, device, releaseRequest };
    }

    it('rejecting a release leaves the device STORED and records the reason', async () => {
      const { agent, device, releaseRequest } = await storedDeviceWithRequest();
      const reason = 'Please collect the device after 16:00.';

      const response = await request(server as never)
        .patch(`/api/admin/release-requests/${releaseRequest.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: reason });

      expect(response.status).toBe(200);
      const result = body<{
        releaseRequest: { status: string; rejectionReason: string; reviewedBy: string | null };
        device: { storageStatus: string };
      }>(response);

      expect(result.releaseRequest.status).toBe('REJECTED');
      expect(result.device.storageStatus).toBe('STORED');

      const persistedRequest = await prisma.releaseRequest.findUniqueOrThrow({
        where: { id: releaseRequest.id },
      });
      expect(persistedRequest.status).toBe('REJECTED');
      expect(persistedRequest.rejectionReason).toBe(reason);
      expect(persistedRequest.reviewedBy).toBe(adminId);
      expect(persistedRequest.reviewedAt).toBeInstanceOf(Date);

      const persistedDevice = await prisma.device.findUniqueOrThrow({
        where: { id: device.id },
      });
      expect(persistedDevice.storageStatus).toBe('STORED');

      // …and the owner may ask again.
      expect(
        (await agent.post(`/api/devices/${device.id}/release-requests`)).status,
      ).toBe(201);
    });

    it('requires a reason when rejecting a release', async () => {
      const { releaseRequest } = await storedDeviceWithRequest();
      const response = await request(server as never)
        .patch(`/api/admin/release-requests/${releaseRequest.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: '' });
      expect(response.status).toBe(422);
    });

    it('approving a release moves the device to RELEASED and records the reviewer', async () => {
      const { device, releaseRequest } = await storedDeviceWithRequest();

      const response = await request(server as never)
        .patch(`/api/admin/release-requests/${releaseRequest.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const result = body<{
        releaseRequest: { status: string };
        device: { storageStatus: string; storageToken: string | null };
      }>(response);

      expect(result.releaseRequest.status).toBe('APPROVED');
      expect(result.device.storageStatus).toBe('RELEASED');
      expect(result.device.storageToken).toBeTruthy();

      const persistedRequest = await prisma.releaseRequest.findUniqueOrThrow({
        where: { id: releaseRequest.id },
      });
      expect(persistedRequest.status).toBe('APPROVED');
      expect(persistedRequest.reviewedBy).toBe(adminId);
      expect(persistedRequest.reviewedAt).toBeInstanceOf(Date);

      const persistedDevice = await prisma.device.findUniqueOrThrow({
        where: { id: device.id },
      });
      expect(persistedDevice.storageStatus).toBe('RELEASED');
    });

    it('refuses a second decision on the same release request', async () => {
      const { releaseRequest } = await storedDeviceWithRequest();
      const path = `/api/admin/release-requests/${releaseRequest.id}/approve`;

      expect(
        (
          await request(server as never)
            .patch(path)
            .set('Authorization', `Bearer ${adminToken}`)
        ).status,
      ).toBe(200);
      expect(
        (
          await request(server as never)
            .patch(path)
            .set('Authorization', `Bearer ${adminToken}`)
        ).status,
      ).toBe(409);
    });

    it('prevents two simultaneous release approvals from both succeeding', async () => {
      const { device, releaseRequest } = await storedDeviceWithRequest();
      const path = `/api/admin/release-requests/${releaseRequest.id}/approve`;

      const [first, second] = await Promise.all([
        request(server as never)
          .patch(path)
          .set('Authorization', `Bearer ${adminToken}`),
        request(server as never)
          .patch(path)
          .set('Authorization', `Bearer ${adminToken}`),
      ]);

      expect([first.status, second.status].sort()).toEqual([200, 409]);
      expect(
        (await prisma.device.findUniqueOrThrow({ where: { id: device.id } }))
          .storageStatus,
      ).toBe('RELEASED');
    });

    it('returns 404 for an unknown release request', async () => {
      const response = await request(server as never)
        .patch(
          '/api/admin/release-requests/00000000-0000-0000-0000-000000000000/approve',
        )
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(404);
    });

    it('rejects an invalid status filter', async () => {
      const response = await request(server as never)
        .get('/api/admin/release-requests?status=NONSENSE')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(422);
    });
  });

  // --------------------------------------------------------------- lists ---

  describe('administrator listings', () => {
    it('lists pending storage requests with the owner details', async () => {
      const { agent, universityId } = await newCampusUser();
      const device = await createDevice(agent, { productName: 'Listing Laptop' });

      const response = await request(server as never)
        .get('/api/admin/storage-requests?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);

      const listed = body<
        Array<{
          id: string;
          storageStatus: string;
          owner: { fullName: string; universityId: string };
        }>
      >(response);

      const found = listed.find((item) => item.id === device.id);
      expect(found).toBeDefined();
      expect(found?.storageStatus).toBe('PENDING');
      expect(found?.owner.universityId).toBe(universityId);
    });

    it('lists stored devices with their tokens', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      const approved = body<{ storageToken: string }>(
        await request(server as never)
          .patch(`/api/admin/devices/${device.id}/approve-storage`)
          .set('Authorization', `Bearer ${adminToken}`),
      );

      const response = await request(server as never)
        .get('/api/admin/devices/stored')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);

      const listed = body<Array<{ id: string; storageToken: string }>>(response);
      expect(listed.find((item) => item.id === device.id)?.storageToken).toBe(
        approved.storageToken,
      );
    });
  });

  // --------------------------------------------------------- persistence ---

  describe('persistence of the complete workflow', () => {
    it('runs storage-to-release end to end and leaves consistent rows', async () => {
      const { agent, id: userId } = await newCampusUser();
      const device = await createDevice(agent, { productName: 'Workflow Laptop' });

      // storage approval
      const approved = body<{ storageToken: string }>(
        await request(server as never)
          .patch(`/api/admin/devices/${device.id}/approve-storage`)
          .set('Authorization', `Bearer ${adminToken}`),
      );

      // release request
      const releaseRequest = body<{ id: string }>(
        await agent.post(`/api/devices/${device.id}/release-requests`),
      );

      // release approval
      const decided = body<{ device: { storageStatus: string } }>(
        await request(server as never)
          .patch(`/api/admin/release-requests/${releaseRequest.id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`),
      );
      expect(decided.device.storageStatus).toBe('RELEASED');

      const finalDevice = await prisma.device.findUniqueOrThrow({
        where: { id: device.id },
      });
      const finalRequest = await prisma.releaseRequest.findUniqueOrThrow({
        where: { id: releaseRequest.id },
      });

      expect(finalDevice.userId).toBe(userId);
      expect(finalDevice.storageStatus).toBe('RELEASED');
      expect(finalDevice.storageToken).toBe(approved.storageToken);
      expect(finalDevice.storageApprovedBy).toBe(adminId);
      expect(finalDevice.storageRejectedAt).toBeNull();
      expect(finalRequest.deviceId).toBe(device.id);
      expect(finalRequest.status).toBe('APPROVED');
      expect(finalRequest.reviewedBy).toBe(adminId);

      // The owner sees the same state through the API.
      const mine = body<Array<{ id: string; storageStatus: string; canRequestRelease: boolean }>>(
        await agent.get('/api/devices/my'),
      );
      const view = mine.find((item) => item.id === device.id);
      expect(view?.storageStatus).toBe('RELEASED');
      expect(view?.canRequestRelease).toBe(false);
    });
  });

  // ----------------------------------------------------------- dashboard ---

  describe('administrator dashboard statistics', () => {
    interface StatsBody {
      totals: {
        users: number;
        devices: number;
        byStorageStatus: Record<string, number>;
        releaseRequests: { total: number; byStatus: Record<string, number> };
      };
      byProductType: Array<{
        productType: string;
        total: number;
        byStorageStatus: Record<string, number>;
      }>;
      awaiting: { storageReview: number; releaseDecision: number };
    }

    const fetchStats = async (): Promise<StatsBody> =>
      body<StatsBody>(
        await request(server as never)
          .get('/api/admin/stats')
          .set('Authorization', `Bearer ${adminToken}`),
      );

    it('rejects anonymous and campus-user access', async () => {
      expect(
        (await request(server as never).get('/api/admin/stats')).status,
      ).toBe(401);

      const { agent } = await newCampusUser();
      expect((await agent.get('/api/admin/stats')).status).toBe(403);
    });

    it('agrees with the database on every figure', async () => {
      const stats = await fetchStats();

      const [devices, users, releases, byStatus, byTypeAndStatus] =
        await Promise.all([
          prisma.device.count(),
          prisma.user.count(),
          prisma.releaseRequest.count(),
          prisma.device.groupBy({ by: ['storageStatus'], _count: { _all: true } }),
          prisma.device.groupBy({
            by: ['productType', 'storageStatus'],
            _count: { _all: true },
          }),
        ]);

      expect(stats.totals.devices).toBe(devices);
      expect(stats.totals.users).toBe(users);
      expect(stats.totals.releaseRequests.total).toBe(releases);

      for (const row of byStatus) {
        expect(stats.totals.byStorageStatus[row.storageStatus]).toBe(
          row._count._all,
        );
      }

      for (const row of byTypeAndStatus) {
        const entry = stats.byProductType.find(
          (item) => item.productType === row.productType,
        );
        expect(entry).toBeDefined();
        expect(entry?.byStorageStatus[row.storageStatus]).toBe(row._count._all);
      }

      // Each category accounts for all of its own devices, and the categories
      // together account for every device.
      for (const entry of stats.byProductType) {
        expect(
          Object.values(entry.byStorageStatus).reduce((a, b) => a + b, 0),
        ).toBe(entry.total);
      }
      expect(
        stats.byProductType.reduce((sum, entry) => sum + entry.total, 0),
      ).toBe(devices);
      expect(
        Object.values(stats.totals.byStorageStatus).reduce((a, b) => a + b, 0),
      ).toBe(devices);

      // The queues are the same numbers the sections act on.
      expect(stats.awaiting.storageReview).toBe(
        stats.totals.byStorageStatus.PENDING,
      );
      expect(stats.awaiting.releaseDecision).toBe(
        stats.totals.releaseRequests.byStatus.PENDING,
      );
    });

    it('lists every product type, including ones with no devices', async () => {
      const stats = await fetchStats();
      expect(
        stats.byProductType.map((entry) => entry.productType).sort(),
      ).toEqual([
        'DESKTOP_COMPUTER',
        'LAPTOP',
        'MOBILE_PHONE',
        'OTHER',
        'TABLET',
      ]);
    });

    it('reflects a storage approval immediately', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);

      const before = await fetchStats();

      await request(server as never)
        .patch(`/api/admin/devices/${device.id}/approve-storage`)
        .set('Authorization', `Bearer ${adminToken}`);

      const after = await fetchStats();

      expect(after.awaiting.storageReview).toBe(before.awaiting.storageReview - 1);
      expect(after.totals.byStorageStatus.PENDING).toBe(
        before.totals.byStorageStatus.PENDING - 1,
      );
      expect(after.totals.byStorageStatus.STORED).toBe(
        before.totals.byStorageStatus.STORED + 1,
      );
      // Approving moves a device between statuses; it does not create one.
      expect(after.totals.devices).toBe(before.totals.devices);
    });

    it('reflects a new release request immediately', async () => {
      const { agent } = await newCampusUser();
      const device = await createDevice(agent);
      await request(server as never)
        .patch(`/api/admin/devices/${device.id}/approve-storage`)
        .set('Authorization', `Bearer ${adminToken}`);

      const before = await fetchStats();
      await agent.post(`/api/devices/${device.id}/release-requests`);
      const after = await fetchStats();

      expect(after.awaiting.releaseDecision).toBe(
        before.awaiting.releaseDecision + 1,
      );
      expect(after.totals.releaseRequests.total).toBe(
        before.totals.releaseRequests.total + 1,
      );
    });
  });
});
