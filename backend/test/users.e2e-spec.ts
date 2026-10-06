import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import {
  createSessionMiddleware,
  useSessions,
} from '../src/common/auth/session-middleware.js';
import { SUPABASE_CLIENT } from '../src/common/database/supabase.module.js';
import {
  createTestSupabase,
  resetDatabase,
} from '../src/common/database/test-database.js';
import {
  createFakePhotoStorage,
  type FakeS3,
  keyOf,
  TEST_PHOTOS_BASE_URL,
} from '../src/common/uploads/fake-s3.js';
import { PhotoStorage } from '../src/common/uploads/photo-storage.js';

const PASSWORD = 'password123';

function signupBody(name: string) {
  return { username: name.toLowerCase(), name, password: PASSWORD };
}

async function createApp(storage: PhotoStorage): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PhotoStorage)
    .useValue(storage)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(createSessionMiddleware(app.get(SUPABASE_CLIENT), 'test-secret'));
  await app.init();
  return app;
}

describe('Users & Auth (e2e)', () => {
  let app: INestApplication;
  let s3: FakeS3;
  let storage: PhotoStorage;

  beforeEach(async () => {
    await resetDatabase(createTestSupabase());
    ({ s3, storage } = createFakePhotoStorage());

    app = await createApp(storage);
  });

  afterEach(async () => {
    await app.close();
  });

  it('signs up a new user and returns their profile', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Ada'))
      .expect(201);

    expect(res.body).toMatchObject({
      name: 'Ada',
      photoUrl: '',
      followerCount: 0,
      followingCount: 0,
    });
    expect(res.body.id).toBeTruthy();
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('rejects signing up with a taken username', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Grace'))
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Grace'))
      .expect(409);
  });

  it.each([
    ['a short username', { username: 'ab' }],
    ['an uppercase username', { username: 'Grace' }],
    ['a username with spaces', { username: 'grace h' }],
    ['a short password', { password: 'seven77' }],
    ['a long password', { password: 'x'.repeat(21) }],
    ['an empty name', { name: '' }],
  ])('rejects signing up with %s', async (_label, override) => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ ...signupBody('Valid'), ...override })
      .expect(400);
  });

  it('logs in an existing user with the right password', async () => {
    const signup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Turing'));

    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post('/auth/login')
      .send({ username: 'turing', password: PASSWORD })
      .expect(200);

    expect(res.body.id).toBe(signup.body.id);
    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.id).toBe(signup.body.id);
  });

  it('rejects a wrong password and an unknown username the same way', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Turing'));

    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'turing', password: 'not-the-one' })
      .expect(401);
    const unknownUser = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'nobody', password: PASSWORD })
      .expect(401);

    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });

  it('persists a session across requests and supports logout', async () => {
    const agent = request.agent(app.getHttpServer());
    const signup = await agent
      .post('/auth/signup')
      .send(signupBody('Hopper'))
      .expect(201);

    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.id).toBe(signup.body.id);

    await agent.post('/auth/logout').expect(204);
    await agent.get('/auth/me').expect(401);
  });

  it('keeps a session across a backend restart', async () => {
    const signup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Hamilton'))
      .expect(201);
    const cookie = signup.get('Set-Cookie') ?? [];

    await app.close();
    app = await createApp(storage);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body.id).toBe(signup.body.id);
  });

  it('removes the stored session on logout', async () => {
    const db = createTestSupabase();
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signup').send(signupBody('Liskov')).expect(201);

    const before = await db.from('sessions').select('sid').throwOnError();
    expect(before.data).toHaveLength(1);

    await agent.post('/auth/logout').expect(204);

    const after = await db.from('sessions').select('sid').throwOnError();
    expect(after.data).toHaveLength(0);
  });

  it('rejects /auth/me without a session', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('fetches a user profile without authentication', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Turing'))
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/users/${login.body.id}`)
      .expect(200);
    expect(res.body.name).toBe('Turing');
  });

  it('fetches a user profile by username without authentication', async () => {
    const signup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Hopper'))
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/users/by-username/${signup.body.username}`)
      .expect(200);
    expect(res.body.id).toBe(signup.body.id);
    expect(res.body.name).toBe('Hopper');
  });

  it('returns 404 for an unknown username', async () => {
    await request(app.getHttpServer())
      .get('/users/by-username/nobody')
      .expect(404);
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
    const me = await agent.post('/auth/signup').send(signupBody('Lovelace'));
    const other = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Babbage'));

    await agent
      .post(`/users/${other.body.id}/photo`)
      .attach('photo', Buffer.from('fake'), 'photo.jpg')
      .expect(403);
    void me;
  });

  it('rejects a disallowed file type', async () => {
    const agent = request.agent(app.getHttpServer());
    const me = await agent.post('/auth/signup').send(signupBody('Curie'));

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
    const me = await agent.post('/auth/signup').send(signupBody('Franklin'));

    const res = await agent
      .post(`/users/${me.body.id}/photo`)
      .attach('photo', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(res.body.photoUrl).toMatch(
      new RegExp(`^${TEST_PHOTOS_BASE_URL}/photos/.+\\.png$`),
    );
    expect(s3.keys()).toEqual([keyOf(res.body.photoUrl)]);
  });

  it('returns 500 and keeps the profile unchanged when the upload to S3 fails', async () => {
    const agent = request.agent(app.getHttpServer());
    const me = await agent.post('/auth/signup').send(signupBody('Meitner'));
    s3.failPut = true;

    await agent
      .post(`/users/${me.body.id}/photo`)
      .attach('photo', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(500);

    const profile = await agent.get(`/users/${me.body.id}`).expect(200);
    expect(profile.body.photoUrl).toBe('');
  });

  it('rejects a bio update without a session', async () => {
    await request(app.getHttpServer())
      .patch('/users/some-id/bio')
      .send({ bio: 'hello' })
      .expect(401);
  });

  it('rejects updating a bio for a different user while logged in', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/signup').send(signupBody('Noether'));
    const other = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody('Hilbert'));

    await agent
      .patch(`/users/${other.body.id}/bio`)
      .send({ bio: 'hello' })
      .expect(403);
  });

  it('rejects a bio longer than 140 characters', async () => {
    const agent = request.agent(app.getHttpServer());
    const me = await agent.post('/auth/signup').send(signupBody('Euler'));

    await agent
      .patch(`/users/${me.body.id}/bio`)
      .send({ bio: 'x'.repeat(141) })
      .expect(400);
  });

  it('updates and returns the profile bio', async () => {
    const agent = request.agent(app.getHttpServer());
    const me = await agent.post('/auth/signup').send(signupBody('Noether2'));

    const res = await agent
      .patch(`/users/${me.body.id}/bio`)
      .send({ bio: 'Mathematician.' })
      .expect(200);

    expect(res.body.bio).toBe('Mathematician.');
  });

  describe('in production behind the HTTPS proxy', () => {
    let prodApp: NestExpressApplication;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PhotoStorage)
        .useValue(storage)
        .compile();

      prodApp = moduleFixture.createNestApplication<NestExpressApplication>();
      prodApp.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      useSessions(prodApp, prodApp.get(SUPABASE_CLIENT), {
        secret: 'test-secret',
        production: true,
      });
      await prodApp.init();
    });

    afterEach(async () => {
      await prodApp.close();
    });

    it('sends a Secure session cookie when the proxy forwarded HTTPS', async () => {
      const res = await request(prodApp.getHttpServer())
        .post('/auth/signup')
        .set('X-Forwarded-Proto', 'https')
        .send(signupBody('Secure'))
        .expect(201);

      const cookie = res.get('Set-Cookie')?.join(';') ?? '';
      expect(cookie).toMatch(/connect\.sid=/);
      expect(cookie).toMatch(/; Secure/);
    });

    it('never sends the session cookie over plain HTTP', async () => {
      const res = await request(prodApp.getHttpServer())
        .post('/auth/signup')
        .send(signupBody('Plain'))
        .expect(201);

      expect(res.get('Set-Cookie')).toBeUndefined();
    });
  });
});
