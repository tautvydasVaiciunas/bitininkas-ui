import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../../src/app.module';
import { ActivityLog } from '../../src/activity-log/activity-log.entity';
import { Assignment } from '../../src/assignments/assignment.entity';
import { Hive, HiveStatus } from '../../src/hives/hive.entity';
import { Notification } from '../../src/notifications/notification.entity';
import { StepProgress } from '../../src/progress/step-progress.entity';
import { Task, TaskFrequency } from '../../src/tasks/task.entity';
import { TaskStep } from '../../src/tasks/steps/task-step.entity';
import { User, UserRole } from '../../src/users/user.entity';

jest.setTimeout(30000);

describe('Hives & Tasks E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let server: request.SuperTest<request.Test>;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
    process.env.THROTTLE_TTL = '1';
    process.env.THROTTLE_LIMIT = '100';
    process.env.POSTGRES_HOST = process.env.POSTGRES_HOST ?? '127.0.0.1';
    process.env.POSTGRES_PORT = process.env.POSTGRES_PORT ?? '5432';
    process.env.POSTGRES_USER = process.env.POSTGRES_USER ?? 'postgres';
    process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD ?? 'postgres';
    process.env.POSTGRES_DB = process.env.POSTGRES_DB ?? 'busmedaus';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();

    await resetDatabase(dataSource);
    await seedDatabase(dataSource);

    server = request(app.getHttpServer());
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('logs in, lists hives, creates a hive and lists tasks', async () => {
    const loginResponse = await server
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'password' })
      .expect(201);

    const token = loginResponse.body.accessToken;
    expect(token).toBeDefined();

    const hivesResponse = await server
      .get('/hives')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(hivesResponse.body)).toBe(true);
    expect(hivesResponse.body.length).toBeGreaterThan(0);

    const createResponse = await server
      .post('/hives')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'QA Hive' })
      .expect(201);

    expect(createResponse.body.label).toBe('QA Hive');

    const tasksResponse = await server
      .get('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(tasksResponse.body)).toBe(true);
    expect(tasksResponse.body.length).toBeGreaterThan(0);
  });
});

async function resetDatabase(dataSource: DataSource) {
  const repositories = [
    dataSource.getRepository(StepProgress),
    dataSource.getRepository(Assignment),
    dataSource.getRepository(TaskStep),
    dataSource.getRepository(Notification),
    dataSource.getRepository(ActivityLog),
    dataSource.getRepository(Task),
    dataSource.getRepository(Hive),
    dataSource.getRepository(User),
  ];

  const tableNames = repositories
    .map((repository) => `"${repository.metadata.tableName}"`)
    .join(', ');

  if (tableNames.length) {
    await dataSource.query(
      `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`,
    );
  }
}

async function seedDatabase(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const hiveRepository = dataSource.getRepository(Hive);
  const taskRepository = dataSource.getRepository(Task);

  const passwordHash = await bcrypt.hash('password', 10);

  const admin = userRepository.create({
    email: 'admin@example.com',
    passwordHash,
    role: UserRole.ADMIN,
    name: 'Admin User',
  });

  const manager = userRepository.create({
    email: 'manager@example.com',
    passwordHash,
    role: UserRole.MANAGER,
    name: 'Manager User',
  });

  await userRepository.save([admin, manager]);

  const hive = hiveRepository.create({
    label: 'Seed Hive',
    ownerUserId: admin.id,
    status: HiveStatus.ACTIVE,
  });

  await hiveRepository.save(hive);

  const task = taskRepository.create({
    title: 'Seed Task',
    description: 'Seed task description',
    category: 'general',
    seasonMonths: [5],
    frequency: TaskFrequency.ONCE,
    defaultDueDays: 7,
    createdByUserId: manager.id,
  });

  await taskRepository.save(task);
}
