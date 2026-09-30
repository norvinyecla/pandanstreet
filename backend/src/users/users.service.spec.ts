import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { createCsvStores, type CsvStores } from '../common/csv/csv-stores.js';
import { newUser } from './test-fixtures.js';
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
    const user = await service.create(newUser('Ada'));
    expect(user.name).toBe('Ada');
    expect(user.photoUrl).toBe('');
    expect(user.id).toBeTruthy();
  });

  it('rejects creating a second user with a taken username', async () => {
    await service.create(newUser('Grace'));
    await expect(service.create(newUser('Grace'))).rejects.toBeInstanceOf(
      ConflictException,
    );

    const all = await stores.users.readAll();
    expect(all).toHaveLength(1);
  });

  it('signUp stores a password hash, not the password', async () => {
    const user = await service.signUp('hopper', 'Grace Hopper', 'cobol1959');
    expect(user.username).toBe('hopper');
    expect(user.name).toBe('Grace Hopper');
    expect(user.passwordHash).toBeTruthy();
    expect(user.passwordHash).not.toContain('cobol1959');
  });

  it('authenticate accepts the right password and rejects wrong ones', async () => {
    const user = await service.signUp('hopper', 'Grace Hopper', 'cobol1959');

    await expect(service.authenticate('hopper', 'cobol1959')).resolves.toEqual(
      user,
    );
    await expect(
      service.authenticate('hopper', 'wrong-pass'),
    ).resolves.toBeUndefined();
    await expect(
      service.authenticate('nobody', 'cobol1959'),
    ).resolves.toBeUndefined();
  });

  it('getProfile does not expose the password hash', async () => {
    const user = await service.signUp('lovelace', 'Ada', 'engine1843');
    const profile = await service.getProfile(user.id);
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('getProfile returns follower/following counts computed from follows.csv', async () => {
    const alice = await service.create(newUser('Alice'));
    const bob = await service.create(newUser('Bob'));
    const carol = await service.create(newUser('Carol'));

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
      username: 'alice',
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

  it('getProfileByUsername returns the profile for a username, ignoring case', async () => {
    const user = await service.signUp('lovelace', 'Ada', 'engine1843');

    const profile = await service.getProfileByUsername('LoveLace');

    expect(profile.id).toBe(user.id);
    expect(profile.username).toBe('lovelace');
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('getProfileByUsername throws NotFoundException for an unknown username', async () => {
    await expect(service.getProfileByUsername('nobody')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('setPhotoUrl updates the stored photo path', async () => {
    const user = await service.create(newUser('Dana'));
    const first = await service.setPhotoUrl(user.id, '/uploads/dana.jpg');
    expect(first.user.photoUrl).toBe('/uploads/dana.jpg');
    expect(first.previousPhotoUrl).toBe('');

    const profile = await service.getProfile(user.id);
    expect(profile.photoUrl).toBe('/uploads/dana.jpg');
  });

  it('setPhotoUrl returns the photo path it replaced', async () => {
    const user = await service.create(newUser('Dana'));
    await service.setPhotoUrl(user.id, '/uploads/old.jpg');

    const second = await service.setPhotoUrl(user.id, '/uploads/new.jpg');
    expect(second.previousPhotoUrl).toBe('/uploads/old.jpg');
    expect(second.user.photoUrl).toBe('/uploads/new.jpg');
  });

  it('setPhotoUrl throws NotFoundException for an unknown id', async () => {
    await expect(
      service.setPhotoUrl('missing', '/uploads/x.jpg'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('setBio updates the stored bio', async () => {
    const user = await service.create(newUser('Edna'));
    const updated = await service.setBio(user.id, 'Building things.');
    expect(updated.bio).toBe('Building things.');

    const profile = await service.getProfile(user.id);
    expect(profile.bio).toBe('Building things.');
  });

  it('setBio throws NotFoundException for an unknown id', async () => {
    await expect(service.setBio('missing', 'hello')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
