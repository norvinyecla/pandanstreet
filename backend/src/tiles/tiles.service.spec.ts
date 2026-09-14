import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createCsvStores, type CsvStores } from '../common/csv/csv-stores.js';
import { FollowsService } from '../follows/follows.service.js';
import { UsersService } from '../users/users.service.js';
import { TilesService } from './tiles.service.js';

describe('TilesService', () => {
  let dir: string;
  let stores: CsvStores;
  let usersService: UsersService;
  let followsService: FollowsService;
  let service: TilesService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tiles-service-'));
    stores = createCsvStores(dir);
    usersService = new UsersService(stores);
    followsService = new FollowsService(stores, usersService);
    service = new TilesService(stores, usersService);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('createText creates a text tile', async () => {
    const alice = await usersService.create('Alice');

    const tile = await service.createText(alice.id, 'Hello world');

    expect(tile).toMatchObject({ type: 'text', text: 'Hello world', userId: alice.id });
    const rows = await stores.tiles.readAll();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: alice.id, type: 'text', archived: false });
  });

  it('createText throws NotFoundException for an unknown user', async () => {
    await expect(service.createText('missing', 'hi')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('createItem creates an item tile', async () => {
    const alice = await usersService.create('Alice');

    const tile = await service.createItem(
      alice.id,
      '/uploads/photo.jpg',
      'A nice photo',
      'green',
    );

    expect(tile).toMatchObject({
      type: 'item',
      photoUrl: '/uploads/photo.jpg',
      caption: 'A nice photo',
      badgeColor: 'green',
    });
    const rows = await stores.tileItem.readAll();
    expect(rows).toHaveLength(1);
  });

  it('auto-archives the oldest active tile when creating a 4th', async () => {
    const alice = await usersService.create('Alice');
    const first = await service.createText(alice.id, 'first');
    await service.createText(alice.id, 'second');
    await service.createText(alice.id, 'third');

    await service.createText(alice.id, 'fourth');

    const tiles = await stores.tiles.readAll();
    const archived = tiles.find((t) => t.id === first.id);
    expect(archived?.archived).toBe(true);

    const active = await service.getActiveTiles(alice.id);
    expect(active).toHaveLength(3);
    expect(active.map((t) => (t as { text: string }).text)).toEqual([
      'fourth',
      'third',
      'second',
    ]);
  });

  it('getActiveTiles returns tiles most recently created first, excluding archived', async () => {
    const alice = await usersService.create('Alice');
    await service.createText(alice.id, 'first');
    await service.createItem(alice.id, '/uploads/p.jpg', 'caption', 'red');

    const active = await service.getActiveTiles(alice.id);

    expect(active).toHaveLength(2);
    expect(active[0]).toMatchObject({ type: 'item', badgeColor: 'red' });
    expect(active[1]).toMatchObject({ type: 'text', text: 'first' });
  });

  it('getActiveTiles throws NotFoundException for an unknown user', async () => {
    await expect(service.getActiveTiles('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('editText updates an existing text tile', async () => {
    const alice = await usersService.create('Alice');
    const tile = await service.createText(alice.id, 'original');

    const updated = await service.editText(tile.id, alice.id, 'updated');

    expect(updated).toMatchObject({ type: 'text', text: 'updated' });
    const rows = await stores.tileText.readAll();
    expect(rows[0].text).toBe('updated');
  });

  it('editText throws BadRequestException for an item tile', async () => {
    const alice = await usersService.create('Alice');
    const tile = await service.createItem(alice.id, '/uploads/p.jpg', 'cap', 'red');

    await expect(
      service.editText(tile.id, alice.id, 'nope'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('editText throws ForbiddenException when editing another user\'s tile', async () => {
    const alice = await usersService.create('Alice');
    const bob = await usersService.create('Bob');
    const tile = await service.createText(alice.id, 'original');

    await expect(
      service.editText(tile.id, bob.id, 'hacked'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('editText throws NotFoundException for an unknown tile', async () => {
    const alice = await usersService.create('Alice');

    await expect(
      service.editText('missing', alice.id, 'text'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getShoutouts returns Text tiles from followed profiles, most recent first', async () => {
    const alice = await usersService.create('Alice');
    const bob = await usersService.create('Bob');
    const carol = await usersService.create('Carol');
    await followsService.follow(alice.id, bob.id);
    await service.createText(bob.id, 'from bob');
    await service.createItem(bob.id, '/uploads/p.jpg', 'cap', 'red');
    await service.createText(carol.id, 'from carol, not followed');

    const shoutouts = await service.getShoutouts(alice.id);

    expect(shoutouts).toHaveLength(1);
    expect(shoutouts[0]).toMatchObject({
      text: 'from bob',
      author: { id: bob.id, name: 'Bob' },
    });
  });

  it('getShoutouts caps results at 20', async () => {
    // Each user can have at most 3 active tiles, so spread 24 text tiles
    // across 8 followed users to exceed the 20-item cap.
    const alice = await usersService.create('Alice');
    for (let u = 0; u < 8; u++) {
      const followee = await usersService.create(`Followee${u}`);
      await followsService.follow(alice.id, followee.id);
      for (let i = 0; i < 3; i++) {
        await service.createText(followee.id, `text ${u}-${i}`);
      }
    }

    const shoutouts = await service.getShoutouts(alice.id);

    expect(shoutouts).toHaveLength(20);
  });

  it('getBulletinBoard returns Item tiles from followed profiles, most recent first', async () => {
    const alice = await usersService.create('Alice');
    const bob = await usersService.create('Bob');
    const carol = await usersService.create('Carol');
    await followsService.follow(alice.id, bob.id);
    await service.createItem(bob.id, '/uploads/p.jpg', 'from bob', 'green');
    await service.createText(bob.id, 'text, not an item');
    await service.createItem(carol.id, '/uploads/q.jpg', 'not followed', 'red');

    const bulletin = await service.getBulletinBoard(alice.id);

    expect(bulletin).toHaveLength(1);
    expect(bulletin[0]).toMatchObject({
      caption: 'from bob',
      badgeColor: 'green',
      author: { id: bob.id, name: 'Bob' },
    });
  });

  it('getBulletinBoard caps results at 21', async () => {
    // Each user can have at most 3 active tiles, so spread 24 item tiles
    // across 8 followed users to exceed the 21-item cap.
    const alice = await usersService.create('Alice');
    for (let u = 0; u < 8; u++) {
      const followee = await usersService.create(`Followee${u}`);
      await followsService.follow(alice.id, followee.id);
      for (let i = 0; i < 3; i++) {
        await service.createItem(
          followee.id,
          '/uploads/p.jpg',
          `caption ${u}-${i}`,
          'green',
        );
      }
    }

    const bulletin = await service.getBulletinBoard(alice.id);

    expect(bulletin).toHaveLength(21);
  });
});
