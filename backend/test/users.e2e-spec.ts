import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import session from 'express-session';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Users & Auth (e2e)', () => {
  let app: INestApplication;
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'users-e2e-'));
    process.env.DATA_DIR = dir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it('logs in with a new name, creating the user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: 'Ada' })
      .expect(201);

    expect(res.body).toMatchObject({
      name: 'Ada',
      photoUrl: '',
      followerCount: 0,
      followingCount: 0,
    });
    expect(res.body.id).toBeTruthy();
  });

  it('rejects an empty name on login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: '' })
      .expect(400);
  });

  it('reuses the same user id across repeated logins with the same name', async () => {
    const first = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: 'Grace' })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: 'Grace' })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
  });

  it('persists a session across requests and supports logout', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/auth/login')
      .send({ name: 'Hopper' })
      .expect(201);

    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.id).toBe(login.body.id);

    await agent.post('/auth/logout').expect(204);
    await agent.get('/auth/me').expect(401);
  });

  it('rejects /auth/me without a session', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('fetches a user profile without authentication', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: 'Turing' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/users/${login.body.id}`)
      .expect(200);
    expect(res.body.name).toBe('Turing');
  });

  it('returns 404 for an unknown user profile', async () => {
    await request(app.getHttpServer()).get('/users/does-not-exist').expect(404);
  });

  it('rejects a photo upload without a session', async () => {
    await request(app.getHttpServer())
      .post('/users/some-id/photo')
      .attach('photo', Buffer.from('fake'), 'photo.jpg')
      .expect(401);
  });

  it('rejects uploading a photo to a different user while logged in', async () => {
    const agent = request.agent(app.getHttpServer());
    const me = await agent.post('/auth/login').send({ name: 'Lovelace' });
    const other = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: 'Babbage' });

    await agent
      .post(`/users/${other.body.id}/photo`)
      .attach('photo', Buffer.from('fake'), 'photo.jpg')
      .expect(403);
    void me;
  });

  it('rejects a disallowed file type', async () => {
    const agent = request.agent(app.getHttpServer());
    const me = await agent.post('/auth/login').send({ name: 'Curie' });

    await agent
      .post(`/users/${me.body.id}/photo`)
      .attach('photo', Buffer.from('not a photo'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('accepts a valid photo upload and updates the profile photoUrl', async () => {
    const agent = request.agent(app.getHttpServer());
    const me = await agent.post('/auth/login').send({ name: 'Franklin' });

    const res = await agent
      .post(`/users/${me.body.id}/photo`)
      .attach('photo', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(res.body.photoUrl).toMatch(/^\/uploads\/.+\.png$/);
  });
});
