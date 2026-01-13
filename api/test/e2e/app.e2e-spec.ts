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
  let adminUser: User;
  let managerUser: User;
  let regularUser: User;

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

    const userRepository = dataSource.getRepository(User);
    adminUser = await userRepository.findOneByOrFail({ email: 'admin@example.com' });
    managerUser = await userRepository.findOneByOrFail({ email: 'manager@example.com' });
    regularUser = await userRepository.findOneByOrFail({ email: 'user@example.com' });

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

  it('prevents unauthorized role management', async () => {
    const managerLogin = await server
      .post('/auth/login')
      .send({ email: 'manager@example.com', password: 'password' })
      .expect(201);

    const managerToken = managerLogin.body.accessToken;

    await server
      .patch(`/users/${adminUser.id}/role`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ role: 'admin' })
      .expect(403);

    await server
      .delete(`/users/${regularUser.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);

    const userLogin = await server
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password' })
      .expect(201);

    const userToken = userLogin.body.accessToken;

    await server
      .get('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const adminLogin = await server
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'password' })
      .expect(201);

    const adminToken = adminLogin.body.accessToken;

    const promoteResponse = await server
      .patch(`/users/${managerUser.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);

    expect(promoteResponse.body.role).toBe('admin');

    await server
      .patch(`/users/${managerUser.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'manager' })
      .expect(200);
  });

  it('allows preview for scheduled assignments and blocks completion before start', async () => {
    const userRepository = dataSource.getRepository(User);
    const hiveRepository = dataSource.getRepository(Hive);
    const taskRepository = dataSource.getRepository(Task);
    const stepRepository = dataSource.getRepository(TaskStep);
    const assignmentRepository = dataSource.getRepository(Assignment);

    const passwordHash = await bcrypt.hash('password', 10);
    const upcomingUser = await userRepository.save(
      userRepository.create({
        email: 'upcoming@example.com',
        passwordHash,
        role: UserRole.USER,
        name: 'Upcoming User',
      }),
    );
    const otherUser = await userRepository.save(
      userRepository.create({
        email: 'other@example.com',
        passwordHash,
        role: UserRole.USER,
        name: 'Other User',
      }),
    );

    const hive = await hiveRepository.save(
      hiveRepository.create({
        label: 'Upcoming Hive',
        ownerUserId: upcomingUser.id,
        status: HiveStatus.ACTIVE,
      }),
    );

    const task = await taskRepository.save(
      taskRepository.create({
        title: 'Upcoming Task',
        description: 'Upcoming task description',
        category: 'general',
        seasonMonths: [5],
        frequency: TaskFrequency.ONCE,
        defaultDueDays: 7,
        createdByUserId: adminUser.id,
      }),
    );

    const step = await stepRepository.save(
      stepRepository.create({
        taskId: task.id,
        orderIndex: 0,
        title: 'Step 1',
        contentText: 'Step 1 details',
        requireUserMedia: false,
      }),
    );

    const today = new Date();
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() + 3);
    const dueDate = new Date(today);
    dueDate.setUTCDate(dueDate.getUTCDate() + 7);

    const assignment = await assignmentRepository.save(
      assignmentRepository.create({
        hiveId: hive.id,
        taskId: task.id,
        createdByUserId: adminUser.id,
        startDate: startDate.toISOString().slice(0, 10),
        dueDate: dueDate.toISOString().slice(0, 10),
        status: 'not_started',
      }),
    );

    const upcomingLogin = await server
      .post('/auth/login')
      .send({ email: upcomingUser.email, password: 'password' })
      .expect(201);

    const upcomingToken = upcomingLogin.body.accessToken;

    const otherLogin = await server
      .post('/auth/login')
      .send({ email: otherUser.email, password: 'password' })
      .expect(201);

    const otherToken = otherLogin.body.accessToken;

    await server
      .get(`/assignments/${assignment.id}/preview`)
      .set('Authorization', `Bearer ${upcomingToken}`)
      .expect(200);

    await server
      .get(`/assignments/${assignment.id}/preview`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    const listResponse = await server
      .get('/assignments')
      .set('Authorization', `Bearer ${upcomingToken}`)
      .expect(200);

    const listedIds = listResponse.body.data?.map((item: Assignment) => item.id) ?? [];
    expect(listedIds).toContain(assignment.id);

    await server
      .post('/progress/step-complete')
      .set('Authorization', `Bearer ${upcomingToken}`)
      .send({
        assignmentId: assignment.id,
        taskStepId: step.id,
      })
      .expect(403);
  });

  it('keeps overdue assignments accessible for the assigned user but not others', async () => {
    const userRepository = dataSource.getRepository(User);
    const hiveRepository = dataSource.getRepository(Hive);
    const taskRepository = dataSource.getRepository(Task);
    const assignmentRepository = dataSource.getRepository(Assignment);

    const passwordHash = await bcrypt.hash('password', 10);
    const overdueUser = await userRepository.save(
      userRepository.create({
        email: 'overdue@example.com',
        passwordHash,
        role: UserRole.USER,
        name: 'Overdue User',
      }),
    );
    const strangerUser = await userRepository.save(
      userRepository.create({
        email: 'stranger@example.com',
        passwordHash,
        role: UserRole.USER,
        name: 'Stranger',
      }),
    );

    const hive = await hiveRepository.save(
      hiveRepository.create({
        label: 'Overdue Hive',
        ownerUserId: overdueUser.id,
        status: HiveStatus.ACTIVE,
      }),
    );

    const task = await taskRepository.save(
      taskRepository.create({
        title: 'Overdue Task',
        description: 'Overdue task description',
        category: 'general',
        seasonMonths: [4],
        frequency: TaskFrequency.ONCE,
        defaultDueDays: 7,
        createdByUserId: adminUser.id,
      }),
    );

    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 10);
    const dueDate = new Date();
    dueDate.setUTCDate(dueDate.getUTCDate() - 1);

    const assignment = await assignmentRepository.save(
      assignmentRepository.create({
        hiveId: hive.id,
        taskId: task.id,
        createdByUserId: adminUser.id,
        startDate: startDate.toISOString().slice(0, 10),
        dueDate: dueDate.toISOString().slice(0, 10),
        status: 'in_progress',
      }),
    );

    const overdueLogin = await server
      .post('/auth/login')
      .send({ email: overdueUser.email, password: 'password' })
      .expect(201);

    const strangerLogin = await server
      .post('/auth/login')
      .send({ email: strangerUser.email, password: 'password' })
      .expect(201);

    const overdueToken = overdueLogin.body.accessToken;
    const strangerToken = strangerLogin.body.accessToken;

    await server
      .get(`/assignments/${assignment.id}/run`)
      .set('Authorization', `Bearer ${overdueToken}`)
      .expect(200);

    await server
      .get(`/assignments/${assignment.id}/run`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
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

  const regularUser = userRepository.create({
    email: 'user@example.com',
    passwordHash,
    role: UserRole.USER,
    name: 'Worker Bee',
  });

  await userRepository.save([admin, manager, regularUser]);

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
