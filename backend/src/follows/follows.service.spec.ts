import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createCsvStores, type CsvStores } from '../common/csv/csv-stores.js';
import { UsersService } from '../users/users.service.js';
import { FollowsService } from './follows.service.js';

describe('FollowsService', () => {
  let dir: string;
  let stores: CsvStores;
  let usersService: UsersService;
  let service: FollowsService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'follows-service-'));
    stores = createCsvStores(dir);
    usersService = new UsersService(stores);
    service = new FollowsService(stores, usersService);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('follow creates a follow relationship', async () => {
    const alice = await usersService.create('Alice');
    const bob = await usersService.create('Bob');

    await service.follow(alice.id, bob.id);

    const rows = await stores.follows.readAll();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ followerId: alice.id, followeeId: bob.id });
  });

  it('follow throws BadRequestException on self-follow', async () => {
    const alice = await usersService.create('Alice');

    await expect(service.follow(alice.id, alice.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('follow throws NotFoundException when the followee does not exist', async () => {
    const alice = await usersService.create('Alice');

    await expect(
      service.follow(alice.id, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('follow throws ConflictException on duplicate follow', async () => {
    const alice = await usersService.create('Alice');
    const bob = await usersService.create('Bob');
    await service.follow(alice.id, bob.id);

    await expect(service.follow(alice.id, bob.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('unfollow removes an existing follow relationship', async () => {
    const alice = await usersService.create('Alice');
    const bob = await usersService.create('Bob');
    await service.follow(alice.id, bob.id);

    await service.unfollow(alice.id, bob.id);

    const rows = await stores.follows.readAll();
    expect(rows).toHaveLength(0);
  });

  it('unfollow throws NotFoundException when not following', async () => {
    const alice = await usersService.create('Alice');
    const bob = await usersService.create('Bob');

    await expect(service.unfollow(alice.id, bob.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('listFollowers returns users following the given user', async () => {
    const alice = await usersService.create('Alice');
    const bob = await usersService.create('Bob');
    const carol = await usersService.create('Carol');
    await service.follow(bob.id, alice.id);
    await service.follow(carol.id, alice.id);

    const followers = await service.listFollowers(alice.id);

    expect(followers.map((u) => u.name).sort()).toEqual(['Bob', 'Carol']);
  });

  it('listFollowing returns users the given user follows', async () => {
    const alice = await usersService.create('Alice');
    const bob = await usersService.create('Bob');
    const carol = await usersService.create('Carol');
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
});
