import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CSV_STORES } from '../common/csv/csv.module.js';
import type { CsvStores } from '../common/csv/csv-stores.js';
import { UsersService } from '../users/users.service.js';
import type { FollowUserDto } from './dto/follow-user.dto.js';

const PLAZA_SAMPLE_SIZE = 3;
const PLAZA_MIN_CANDIDATES = 2;
const PLAZA_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class FollowsService {
  constructor(
    @Inject(CSV_STORES) private readonly stores: CsvStores,
    private readonly usersService: UsersService,
  ) {}

  async follow(followerId: string, followeeId: string): Promise<void> {
    if (followerId === followeeId) {
      throw new BadRequestException('Cannot follow yourself');
    }
    await this.ensureUserExists(followeeId);

    const follows = await this.stores.follows.readAll();
    const alreadyFollowing = follows.some(
      (follow) =>
        follow.followerId === followerId && follow.followeeId === followeeId,
    );
    if (alreadyFollowing) {
      throw new ConflictException('Already following this user');
    }

    await this.stores.follows.append({
      followerId,
      followeeId,
      createdAt: new Date().toISOString(),
    });
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    const removed = await this.stores.follows.remove(
      (follow) =>
        follow.followerId === followerId && follow.followeeId === followeeId,
    );
    if (!removed) {
      throw new NotFoundException('Not following this user');
    }
  }

  async listFollowers(userId: string): Promise<FollowUserDto[]> {
    await this.ensureUserExists(userId);
    const follows = await this.stores.follows.readAll();
    const followerIds = follows
      .filter((follow) => follow.followeeId === userId)
      .map((follow) => follow.followerId);
    return this.resolveUsers(followerIds);
  }

  async listFollowing(userId: string): Promise<FollowUserDto[]> {
    await this.ensureUserExists(userId);
    const follows = await this.stores.follows.readAll();
    const followeeIds = follows
      .filter((follow) => follow.followerId === userId)
      .map((follow) => follow.followeeId);
    return this.resolveUsers(followeeIds);
  }

  /**
   * Up to 3 randomly-sampled users `userId` doesn't follow (regardless of
   * whether they follow back) who posted an active Text tile, or an active
   * Item tile badged green/yellow, in the last 24 hours. Returns an empty
   * list unless at least 2 candidates qualify.
   */
  async getPlaza(userId: string): Promise<FollowUserDto[]> {
    await this.ensureUserExists(userId);

    const [follows, tiles, itemRecords, users] = await Promise.all([
      this.stores.follows.readAll(),
      this.stores.tiles.readAll(),
      this.stores.tileItem.readAll(),
      this.stores.users.readAll(),
    ]);

    const followingIds = new Set(
      follows
        .filter((follow) => follow.followerId === userId)
        .map((follow) => follow.followeeId),
    );
    const badgeByTileId = new Map(
      itemRecords.map((record) => [record.tileId, record.badgeColor]),
    );
    const cutoff = Date.now() - PLAZA_WINDOW_MS;

    const qualifyingUserIds = new Set<string>();
    for (const tile of tiles) {
      if (tile.archived) continue;
      if (tile.userId === userId || followingIds.has(tile.userId)) continue;
      if (new Date(tile.createdAt).getTime() < cutoff) continue;

      if (tile.type === 'text') {
        qualifyingUserIds.add(tile.userId);
      } else {
        const badgeColor = badgeByTileId.get(tile.id);
        if (badgeColor === 'green' || badgeColor === 'yellow') {
          qualifyingUserIds.add(tile.userId);
        }
      }
    }

    if (qualifyingUserIds.size < PLAZA_MIN_CANDIDATES) return [];

    const userById = new Map(users.map((user) => [user.id, user]));
    const candidates = [...qualifyingUserIds]
      .map((id) => userById.get(id))
      .filter((user): user is NonNullable<typeof user> => Boolean(user));

    return this.sampleRandom(candidates, PLAZA_SAMPLE_SIZE).map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      photoUrl: user.photoUrl,
    }));
  }

  private sampleRandom<T>(items: T[], count: number): T[] {
    const pool = [...items];
    const sampled: T[] = [];
    while (pool.length > 0 && sampled.length < count) {
      const index = Math.floor(Math.random() * pool.length);
      sampled.push(pool.splice(index, 1)[0]);
    }
    return sampled;
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
  }

  private async resolveUsers(ids: string[]): Promise<FollowUserDto[]> {
    const users = await Promise.all(
      ids.map((id) => this.usersService.findById(id)),
    );
    return users
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        photoUrl: user.photoUrl,
      }));
  }
}
