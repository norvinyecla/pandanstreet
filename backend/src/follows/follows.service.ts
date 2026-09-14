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
      .map((user) => ({ id: user.id, name: user.name, photoUrl: user.photoUrl }));
  }
}
