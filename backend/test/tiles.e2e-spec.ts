import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import session from 'express-session';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import {
  createTestSupabase,
  resetDatabase,
} from '../src/common/database/test-database.js';

describe('Tiles (e2e)', () => {
  let app: INestApplication;
  let dir: string;

  beforeEach(async () => {
    await resetDatabase(createTestSupabase());
    dir = await mkdtemp(join(tmpdir(), 'tiles-e2e-'));
    process.env.DATA_DIR = dir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
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

  async function loginAs(name: string) {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post('/auth/signup')
      .send({ username: name.toLowerCase(), name, password: 'password123' })
      .expect(201);
    return { agent, id: res.body.id as string };
  }

  it('rejects creating a text tile without a session', async () => {
    await request(app.getHttpServer())
      .post('/tiles/text')
      .send({ text: 'Hello' })
      .expect(401);
  });

  it('creates a text tile', async () => {
    const alice = await loginAs('Alice');

    const res = await alice.agent
      .post('/tiles/text')
      .send({ text: 'Hello world' })
      .expect(201);

    expect(res.body).toMatchObject({ type: 'text', text: 'Hello world' });

    const tiles = await request(app.getHttpServer())
      .get(`/tiles/${alice.id}`)
      .expect(200);
    expect(tiles.body).toMatchObject([{ type: 'text', text: 'Hello world' }]);
  });

  it('rejects a text tile over 140 characters', async () => {
    const alice = await loginAs('Alice');

    await alice.agent
      .post('/tiles/text')
      .send({ text: 'a'.repeat(141) })
      .expect(400);
  });

  it('creates an item tile with a photo upload, caption and badge color', async () => {
    const alice = await loginAs('Alice');

    const res = await alice.agent
      .post('/tiles/item')
      .field('caption', 'A nice photo')
      .field('badgeColor', 'green')
      .attach('photo', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      type: 'item',
      caption: 'A nice photo',
      badgeColor: 'green',
    });
    expect(res.body.photoUrl).toMatch(/^\/uploads\/.+\.png$/);
  });

  it('rejects an item tile with an invalid badge color', async () => {
    const alice = await loginAs('Alice');

    await alice.agent
      .post('/tiles/item')
      .field('caption', 'A nice photo')
      .field('badgeColor', 'blue')
      .attach('photo', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('auto-archives the oldest tile when a 4th is created', async () => {
    const alice = await loginAs('Alice');

    await alice.agent.post('/tiles/text').send({ text: 'first' }).expect(201);
    await alice.agent.post('/tiles/text').send({ text: 'second' }).expect(201);
    await alice.agent.post('/tiles/text').send({ text: 'third' }).expect(201);
    await alice.agent.post('/tiles/text').send({ text: 'fourth' }).expect(201);

    const tiles = await request(app.getHttpServer())
      .get(`/tiles/${alice.id}`)
      .expect(200);

    expect(tiles.body).toHaveLength(3);
    expect(tiles.body.map((t: { text: string }) => t.text)).toEqual([
      'fourth',
      'third',
      'second',
    ]);
  });

  it('edits an existing text tile', async () => {
    const alice = await loginAs('Alice');
    const created = await alice.agent
      .post('/tiles/text')
      .send({ text: 'original' })
      .expect(201);

    const updated = await alice.agent
      .patch(`/tiles/${created.body.id}`)
      .send({ text: 'updated' })
      .expect(200);

    expect(updated.body).toMatchObject({ type: 'text', text: 'updated' });
  });

  it('rejects editing an item tile', async () => {
    const alice = await loginAs('Alice');
    const created = await alice.agent
      .post('/tiles/item')
      .field('caption', 'caption')
      .field('badgeColor', 'red')
      .attach('photo', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201);

    await alice.agent
      .patch(`/tiles/${created.body.id}`)
      .send({ text: 'nope' })
      .expect(400);
  });

  it("rejects editing another user's tile", async () => {
    const alice = await loginAs('Alice');
    const bob = await loginAs('Bob');
    const created = await alice.agent
      .post('/tiles/text')
      .send({ text: 'original' })
      .expect(201);

    await bob.agent
      .patch(`/tiles/${created.body.id}`)
      .send({ text: 'hacked' })
      .expect(403);
  });

  it('returns 404 fetching tiles for an unknown user', async () => {
    await request(app.getHttpServer()).get('/tiles/does-not-exist').expect(404);
  });
});
