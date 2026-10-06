import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { createSessionMiddleware } from '../src/common/auth/session-middleware.js';
import { SUPABASE_CLIENT } from '../src/common/database/supabase.module.js';
import {
  createTestSupabase,
  resetDatabase,
} from '../src/common/database/test-database.js';
import { createFakePhotoStorage } from '../src/common/uploads/fake-s3.js';
import { PhotoStorage } from '../src/common/uploads/photo-storage.js';

describe('Follows (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    await resetDatabase(createTestSupabase());

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PhotoStorage)
      .useValue(createFakePhotoStorage().storage)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.use(createSessionMiddleware(app.get(SUPABASE_CLIENT), 'test-secret'));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function loginAs(name: string) {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post('/auth/signup')
      .send({ username: name.toLowerCase(), name, password: 'password123' })
      .expect(201);
    return { agent, id: res.body.id as string };
  }

  it('rejects follow without a session', async () => {
    const other = await loginAs('Bob');
    await request(app.getHttpServer()).post(`/follows/${other.id}`).expect(401);
  });

  it('follows a user and updates counts on both profiles', async () => {
    const alice = await loginAs('Alice');
    const bob = await loginAs('Bob');

    await alice.agent.post(`/follows/${bob.id}`).expect(204);

    const aliceProfile = await request(app.getHttpServer())
      .get(`/users/${alice.id}`)
      .expect(200);
    const bobProfile = await request(app.getHttpServer())
      .get(`/users/${bob.id}`)
      .expect(200);

    expect(aliceProfile.body.followingCount).toBe(1);
    expect(bobProfile.body.followerCount).toBe(1);
  });

  it('rejects following yourself', async () => {
    const alice = await loginAs('Alice');
    await alice.agent.post(`/follows/${alice.id}`).expect(400);
  });

  it('rejects following an unknown user', async () => {
    const alice = await loginAs('Alice');
    await alice.agent.post('/follows/does-not-exist').expect(404);
  });

  it('rejects a duplicate follow', async () => {
    const alice = await loginAs('Alice');
    const bob = await loginAs('Bob');

    await alice.agent.post(`/follows/${bob.id}`).expect(204);
    await alice.agent.post(`/follows/${bob.id}`).expect(409);
  });

  it('unfollows a user and updates counts', async () => {
    const alice = await loginAs('Alice');
    const bob = await loginAs('Bob');

    await alice.agent.post(`/follows/${bob.id}`).expect(204);
    await alice.agent.delete(`/follows/${bob.id}`).expect(204);

    const bobProfile = await request(app.getHttpServer())
      .get(`/users/${bob.id}`)
      .expect(200);
    expect(bobProfile.body.followerCount).toBe(0);
  });

  it('rejects unfollowing a user you do not follow', async () => {
    const alice = await loginAs('Alice');
    const bob = await loginAs('Bob');

    await alice.agent.delete(`/follows/${bob.id}`).expect(404);
  });

  it('lists followers and following', async () => {
    const alice = await loginAs('Alice');
    const bob = await loginAs('Bob');
    const carol = await loginAs('Carol');

    await bob.agent.post(`/follows/${alice.id}`).expect(204);
    await carol.agent.post(`/follows/${alice.id}`).expect(204);
    await alice.agent.post(`/follows/${bob.id}`).expect(204);

    const followers = await request(app.getHttpServer())
      .get(`/follows/${alice.id}/followers`)
      .expect(200);
    const following = await request(app.getHttpServer())
      .get(`/follows/${alice.id}/following`)
      .expect(200);

    expect(followers.body.map((u: { name: string }) => u.name).sort()).toEqual([
      'Bob',
      'Carol',
    ]);
    expect(following.body).toMatchObject([{ name: 'Bob' }]);
  });

  it('returns 404 listing followers for an unknown user', async () => {
    await request(app.getHttpServer())
      .get('/follows/does-not-exist/followers')
      .expect(404);
  });
});
