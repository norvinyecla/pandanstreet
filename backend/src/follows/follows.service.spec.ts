import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createCsvStores, type CsvStores } from '../common/csv/csv-stores.js';
import { TilesService } from '../tiles/tiles.service.js';
import { newUser } from '../users/test-fixtures.js';
import { UsersService } from '../users/users.service.js';
import { FollowsService } from './follows.service.js';

describe('FollowsService', () => {
  let dir: string;
  let stores: CsvStores;
  let usersService: UsersService;
  let tilesService: TilesService;
  let service: FollowsService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'follows-service-'));
    stores = createCsvStores(dir);
    usersService = new UsersService(stores);
    tilesService = new TilesService(stores, usersService);
    service = new FollowsService(stores, usersService);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('follow creates a follow relationship', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));

    await service.follow(alice.id, bob.id);

    const rows = await stores.follows.readAll();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ followerId: alice.id, followeeId: bob.id });
  });

  it('follow throws BadRequestException on self-follow', async () => {
    const alice = await usersService.create(newUser('Alice'));

    await expect(service.follow(alice.id, alice.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('follow throws NotFoundException when the followee does not exist', async () => {
    const alice = await usersService.create(newUser('Alice'));

    await expect(service.follow(alice.id, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('follow throws ConflictException on duplicate follow', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));
    await service.follow(alice.id, bob.id);

    await expect(service.follow(alice.id, bob.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('unfollow removes an existing follow relationship', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));
    await service.follow(alice.id, bob.id);

    await service.unfollow(alice.id, bob.id);

    const rows = await stores.follows.readAll();
    expect(rows).toHaveLength(0);
  });

  it('unfollow throws NotFoundException when not following', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));

    await expect(service.unfollow(alice.id, bob.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('listFollowers returns users following the given user', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));
    const carol = await usersService.create(newUser('Carol'));
    await service.follow(bob.id, alice.id);
    await service.follow(carol.id, alice.id);

    const followers = await service.listFollowers(alice.id);

    expect(followers.map((u) => u.name).sort()).toEqual(['Bob', 'Carol']);
  });

  it('listFollowing returns users the given user follows', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));
    const carol = await usersService.create(newUser('Carol'));
    await service.follow(alice.id, bob.id);
    await service.follow(alice.id, carol.id);

    const following = await service.listFollowing(alice.id);

    expect(following.map((u) => u.name).sort()).toEqual(['Bob', 'Carol']);
  });

  it('listFollowers throws NotFoundException for an unknown user', async () => {
    await expect(service.listFollowers('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('listFollowing throws NotFoundException for an unknown user', async () => {
    await expect(service.listFollowing('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getPlaza returns unfollowed users who posted a Text tile in the last 24h', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));
    const carol = await usersService.create(newUser('Carol'));
    await tilesService.createText(bob.id, 'hi');
    await tilesService.createText(carol.id, 'hey');

    const plaza = await service.getPlaza(alice.id);

    expect(plaza.map((u) => u.id).sort()).toEqual([bob.id, carol.id].sort());
  });

  it('getPlaza includes green/yellow Item tiles but excludes red-only ones', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));
    const carol = await usersService.create(newUser('Carol'));
    const dave = await usersService.create(newUser('Dave'));
    await tilesService.createItem(bob.id, '/uploads/p.jpg', 'cap', 'green');
    await tilesService.createItem(carol.id, '/uploads/p.jpg', 'cap', 'yellow');
    await tilesService.createItem(dave.id, '/uploads/p.jpg', 'cap', 'red');

    const plaza = await service.getPlaza(alice.id);

    expect(plaza.map((u) => u.id).sort()).toEqual([bob.id, carol.id].sort());
  });

  it('getPlaza excludes users the current user already follows and the user themselves', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));
    const carol = await usersService.create(newUser('Carol'));
    await service.follow(alice.id, bob.id);
    await tilesService.createText(bob.id, 'hi');
    await tilesService.createText(carol.id, 'hey');
    await tilesService.createText(alice.id, 'my own text');

    const plaza = await service.getPlaza(alice.id);

    expect(plaza).toHaveLength(0);
  });

  it('getPlaza excludes tiles older than 24 hours', async () => {
    const alice = await usersService.create(newUser('Alice'));
    const bob = await usersService.create(newUser('Bob'));
    const carol = await usersService.create(newUser('Carol'));
    const staleTile = await tilesService.createText(bob.id, 'stale');
    await tilesService.createText(carol.id, 'fresh');
    const staleCreatedAt = new Date(
      Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();
    await stores.tiles.update(
      (record) => record.id === staleTile.id,
      (record) => ({ ...record, createdAt: staleCreatedAt }),
    );

    const plaza = await service.getPlaza(alice.id);

    expect(plaza).toHaveLength(0);
  });

  it('getPlaza samples at most 3 candidates', async () => {
    const alice = await usersService.create(newUser('Alice'));
    for (let i = 0; i < 5; i++) {
      const user = await usersService.create(newUser(`User${i}`));
      await tilesService.createText(user.id, 'hi');
    }

    const plaza = await service.getPlaza(alice.id);

    expect(plaza.length).toBeLessThanOrEqual(3);
  });

  it('getPlaza throws NotFoundException for an unknown user', async () => {
    await expect(service.getPlaza('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
