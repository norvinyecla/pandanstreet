import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CSV_STORES } from '../common/csv/csv.module.js';
import type { CsvStores } from '../common/csv/csv-stores.js';
import type { TileRecord } from '../common/csv/entities.js';
import { UsersService } from '../users/users.service.js';
import type { BulletinItemDto, ShoutoutDto } from './dto/feed.dto.js';
import type { TileDto } from './dto/tile.dto.js';

const MAX_ACTIVE_TILES = 3;
const SHOUTOUTS_LIMIT = 20;
const BULLETIN_BOARD_LIMIT = 21;

@Injectable()
export class TilesService {
  constructor(
    @Inject(CSV_STORES) private readonly stores: CsvStores,
    private readonly usersService: UsersService,
  ) {}

  async createText(userId: string, text: string): Promise<TileDto> {
    await this.ensureUserExists(userId);
    await this.archiveOldestIfAtLimit(userId);

    const tile = await this.stores.tiles.append({
      id: randomUUID(),
      userId,
      type: 'text',
      createdAt: new Date().toISOString(),
      archived: false,
    });
    await this.stores.tileText.append({ tileId: tile.id, text });

    return {
      id: tile.id,
      userId,
      type: 'text',
      createdAt: tile.createdAt,
      text,
    };
  }

  async createItem(
    userId: string,
    photoUrl: string,
    caption: string,
    badgeColor: 'red' | 'yellow' | 'green',
  ): Promise<TileDto> {
    await this.ensureUserExists(userId);
    await this.archiveOldestIfAtLimit(userId);

    const tile = await this.stores.tiles.append({
      id: randomUUID(),
      userId,
      type: 'item',
      createdAt: new Date().toISOString(),
      archived: false,
    });
    await this.stores.tileItem.append({
      tileId: tile.id,
      photoUrl,
      caption,
      badgeColor,
    });

    return {
      id: tile.id,
      userId,
      type: 'item',
      createdAt: tile.createdAt,
      photoUrl,
      caption,
      badgeColor,
    };
  }

  async editText(
    tileId: string,
    userId: string,
    text: string,
  ): Promise<TileDto> {
    const tiles = await this.stores.tiles.readAll();
    const tile = tiles.find((t) => t.id === tileId);
    if (!tile) throw new NotFoundException('Tile not found');
    if (tile.userId !== userId) {
      throw new ForbiddenException("Cannot edit another user's tile");
    }
    if (tile.type !== 'text') {
      throw new BadRequestException('Only Text tiles can be edited');
    }

    await this.stores.tileText.update(
      (record) => record.tileId === tileId,
      (record) => ({ ...record, text }),
    );

    return {
      id: tile.id,
      userId,
      type: 'text',
      createdAt: tile.createdAt,
      text,
    };
  }

  /** Removes a tile from view by archiving it; the row is kept, per the data model rules. */
  async archive(tileId: string, userId: string): Promise<void> {
    const tiles = await this.stores.tiles.readAll();
    const tile = tiles.find((t) => t.id === tileId);
    if (!tile || tile.archived) throw new NotFoundException('Tile not found');
    if (tile.userId !== userId) {
      throw new ForbiddenException("Cannot delete another user's tile");
    }

    await this.stores.tiles.update(
      (record) => record.id === tileId,
      (record): TileRecord => ({ ...record, archived: true }),
    );
  }

  async getActiveTiles(userId: string): Promise<TileDto[]> {
    await this.ensureUserExists(userId);

    const tiles = await this.stores.tiles.readAll();
    const active = tiles
      .filter((tile) => tile.userId === userId && !tile.archived)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const [textRecords, itemRecords] = await Promise.all([
      this.stores.tileText.readAll(),
      this.stores.tileItem.readAll(),
    ]);

    return active
      .map((tile): TileDto | undefined => {
        if (tile.type === 'text') {
          const record = textRecords.find((r) => r.tileId === tile.id);
          if (!record) return undefined;
          return {
            id: tile.id,
            userId: tile.userId,
            type: 'text',
            createdAt: tile.createdAt,
            text: record.text,
          };
        }
        const record = itemRecords.find((r) => r.tileId === tile.id);
        if (!record) return undefined;
        return {
          id: tile.id,
          userId: tile.userId,
          type: 'item',
          createdAt: tile.createdAt,
          photoUrl: record.photoUrl,
          caption: record.caption,
          badgeColor: record.badgeColor,
        };
      })
      .filter((dto): dto is TileDto => dto !== undefined);
  }

  /** Active Text tiles from profiles `userId` follows, most recent first, capped at 20. */
  async getShoutouts(userId: string): Promise<ShoutoutDto[]> {
    await this.ensureUserExists(userId);
    const followeeIds = await this.getFolloweeIds(userId);
    if (followeeIds.size === 0) return [];

    const [tiles, textRecords, users] = await Promise.all([
      this.stores.tiles.readAll(),
      this.stores.tileText.readAll(),
      this.stores.users.readAll(),
    ]);
    const userById = new Map(users.map((user) => [user.id, user]));

    return tiles
      .filter(
        (tile) =>
          tile.type === 'text' &&
          !tile.archived &&
          followeeIds.has(tile.userId),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, SHOUTOUTS_LIMIT)
      .map((tile): ShoutoutDto | undefined => {
        const record = textRecords.find((r) => r.tileId === tile.id);
        const author = userById.get(tile.userId);
        if (!record || !author) return undefined;
        return {
          id: tile.id,
          createdAt: tile.createdAt,
          text: record.text,
          author: {
            id: author.id,
            name: author.name,
            photoUrl: author.photoUrl,
          },
        };
      })
      .filter((dto): dto is ShoutoutDto => dto !== undefined);
  }

  /** Active Item tiles from profiles `userId` follows, most recent first, capped at 21. */
  async getBulletinBoard(userId: string): Promise<BulletinItemDto[]> {
    await this.ensureUserExists(userId);
    const followeeIds = await this.getFolloweeIds(userId);
    if (followeeIds.size === 0) return [];

    const [tiles, itemRecords, users] = await Promise.all([
      this.stores.tiles.readAll(),
      this.stores.tileItem.readAll(),
      this.stores.users.readAll(),
    ]);
    const userById = new Map(users.map((user) => [user.id, user]));

    return tiles
      .filter(
        (tile) =>
          tile.type === 'item' &&
          !tile.archived &&
          followeeIds.has(tile.userId),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, BULLETIN_BOARD_LIMIT)
      .map((tile): BulletinItemDto | undefined => {
        const record = itemRecords.find((r) => r.tileId === tile.id);
        const author = userById.get(tile.userId);
        if (!record || !author) return undefined;
        return {
          id: tile.id,
          createdAt: tile.createdAt,
          photoUrl: record.photoUrl,
          caption: record.caption,
          badgeColor: record.badgeColor,
          author: {
            id: author.id,
            name: author.name,
            photoUrl: author.photoUrl,
          },
        };
      })
      .filter((dto): dto is BulletinItemDto => dto !== undefined);
  }

  private async getFolloweeIds(userId: string): Promise<Set<string>> {
    const follows = await this.stores.follows.readAll();
    return new Set(
      follows
        .filter((follow) => follow.followerId === userId)
        .map((follow) => follow.followeeId),
    );
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
  }

  private async archiveOldestIfAtLimit(userId: string): Promise<void> {
    const tiles = await this.stores.tiles.readAll();
    const active = tiles
      .filter((tile) => tile.userId === userId && !tile.archived)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    if (active.length < MAX_ACTIVE_TILES) return;

    const oldest = active[0];
    await this.stores.tiles.update(
      (record) => record.id === oldest.id,
      (record): TileRecord => ({ ...record, archived: true }),
    );
  }
}
