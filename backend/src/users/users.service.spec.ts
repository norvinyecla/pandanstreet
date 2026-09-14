import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NotFoundException } from '@nestjs/common';
import { createCsvStores, type CsvStores } from '../common/csv/csv-stores.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let dir: string;
  let stores: CsvStores;
  let service: UsersService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'users-service-'));
    stores = createCsvStores(dir);
    service = new UsersService(stores);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates a new user with a generated id and empty photo', async () => {
    const user = await service.create('Ada');
    expect(user.name).toBe('Ada');
    expect(user.photoUrl).toBe('');
    expect(user.id).toBeTruthy();
  });

  it('findOrCreateByName creates on first call and reuses on subsequent calls', async () => {
    const first = await service.findOrCreateByName('Grace');
    const second = await service.findOrCreateByName('Grace');
    expect(second.id).toBe(first.id);

    const all = await stores.users.readAll();
    expect(all).toHaveLength(1);
  });

  it('getProfile returns follower/following counts computed from follows.csv', async () => {
    const alice = await service.create('Alice');
    const bob = await service.create('Bob');
    const carol = await service.create('Carol');

    await stores.follows.append({
      followerId: bob.id,
      followeeId: alice.id,
      createdAt: '2026-01-01',
    });
    await stores.follows.append({
      followerId: carol.id,
      followeeId: alice.id,
      createdAt: '2026-01-02',
    });
    await stores.follows.append({
      followerId: alice.id,
      followeeId: bob.id,
      createdAt: '2026-01-03',
    });

    const profile = await service.getProfile(alice.id);
    expect(profile).toEqual({
      id: alice.id,
      name: 'Alice',
      photoUrl: '',
      bio: '',
      followerCount: 2,
      followingCount: 1,
    });
  });

  it('getProfile throws NotFoundException for an unknown id', async () => {
    await expect(service.getProfile('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('setPhotoUrl updates the stored photo path', async () => {
    const user = await service.create('Dana');
    const updated = await service.setPhotoUrl(user.id, '/uploads/dana.jpg');
    expect(updated.photoUrl).toBe('/uploads/dana.jpg');

    const profile = await service.getProfile(user.id);
    expect(profile.photoUrl).toBe('/uploads/dana.jpg');
  });

  it('setPhotoUrl throws NotFoundException for an unknown id', async () => {
    await expect(
      service.setPhotoUrl('missing', '/uploads/x.jpg'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('setBio updates the stored bio', async () => {
    const user = await service.create('Edna');
    const updated = await service.setBio(user.id, 'Building things.');
    expect(updated.bio).toBe('Building things.');

    const profile = await service.getProfile(user.id);
    expect(profile.bio).toBe('Building things.');
  });

  it('setBio throws NotFoundException for an unknown id', async () => {
    await expect(
      service.setBio('missing', 'hello'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
