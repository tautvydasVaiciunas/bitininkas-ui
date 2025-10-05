import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

process.env.THROTTLE_TTL = '1';
process.env.THROTTLE_LIMIT = '2';

describe('Auth E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in and fetches profile', async () => {
    const email = `test+${Date.now()}@example.com`;
    const password = 'password123';

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    expect(registerResponse.body.accessToken).toBeDefined();
    expect(registerResponse.body.refreshToken).toBeDefined();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const token = loginResponse.body.accessToken;

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meResponse.body.email).toBe(email);
  });

  it('enforces throttling limit and resets after ttl', async () => {
    const email = `throttle+${Date.now()}@example.com`;
    const password = 'password123';

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const token = registerResponse.body.accessToken;
    expect(token).toBeDefined();

    const server = request(app.getHttpServer());

    await server
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await server
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await server
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(429);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    await server
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
