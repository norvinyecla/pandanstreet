import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isUniqueViolation,
  isUuid,
  type BadgeColor,
} from '../common/database/entities.js';
import { SUPABASE_CLIENT } from '../common/database/supabase.module.js';
import { UsersService } from '../users/users.service.js';
import type { FollowUserDto } from './dto/follow-user.dto.js';

const PLAZA_SAMPLE_SIZE = 3;
const PLAZA_MIN_CANDIDATES = 2;
const PLAZA_WINDOW_MS = 24 * 60 * 60 * 1000;

interface UserSummaryRow {
  id: string;
  username: string;
  name: string;
  photo_url: string;
}

function toFollowUserDto(row: UserSummaryRow): FollowUserDto {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    photoUrl: row.photo_url,
  };
}

@Injectable()
export class FollowsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly db: SupabaseClient,
    private readonly usersService: UsersService,
  ) {}

  async follow(followerId: string, followeeId: string): Promise<void> {
    if (followerId === followeeId) {
      throw new BadRequestException('Cannot follow yourself');
    }
    await this.ensureUserExists(followeeId);

    try {
      await this.db
        .from('follows')
        .insert({ follower_id: followerId, followee_id: followeeId })
        .throwOnError();
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Already following this user');
      }
      throw err;
    }
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    if (!isUuid(followeeId)) {
      throw new NotFoundException('Not following this user');
    }
    const { data } = await this.db
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId)
      .select('follower_id')
      .throwOnError();
    if (data.length === 0) {
      throw new NotFoundException('Not following this user');
    }
  }

  async listFollowers(userId: string): Promise<FollowUserDto[]> {
    await this.ensureUserExists(userId);
    const { data } = await this.db
      .from('follows')
      .select(
        'user:users!follows_follower_id_fkey(id, username, name, photo_url)',
      )
      .eq('followee_id', userId)
      .order('created_at')
      .throwOnError()
      .overrideTypes<{ user: UserSummaryRow }[], { merge: false }>();
    return data.map((row) => toFollowUserDto(row.user));
  }

  async listFollowing(userId: string): Promise<FollowUserDto[]> {
    await this.ensureUserExists(userId);
    const { data } = await this.db
      .from('follows')
      .select(
        'user:users!follows_followee_id_fkey(id, username, name, photo_url)',
      )
      .eq('follower_id', userId)
      .order('created_at')
      .throwOnError()
      .overrideTypes<{ user: UserSummaryRow }[], { merge: false }>();
    return data.map((row) => toFollowUserDto(row.user));
  }

  /**
   * Up to 3 randomly-sampled users `userId` doesn't follow (regardless of
   * whether they follow back) who posted an active Text tile, or an active
   * Item tile badged green/yellow, in the last 24 hours. Returns an empty
   * list unless at least 2 candidates qualify.
   */
  async getPlaza(userId: string): Promise<FollowUserDto[]> {
    await this.ensureUserExists(userId);

    const { data: follows } = await this.db
      .from('follows')
      .select('followee_id')
      .eq('follower_id', userId)
      .throwOnError()
      .overrideTypes<{ followee_id: string }[], { merge: false }>();
    const excludedIds = [userId, ...follows.map((f) => f.followee_id)];
    const cutoff = new Date(Date.now() - PLAZA_WINDOW_MS).toISOString();

    const { data: tiles } = await this.db
      .from('tiles')
      .select(
        'type, tile_item(badge_color), author:users(id, username, name, photo_url)',
      )
      .eq('archived', false)
      .gte('created_at', cutoff)
      .not('user_id', 'in', `(${excludedIds.join(',')})`)
      .throwOnError()
      .overrideTypes<
        {
          type: 'text' | 'item';
          tile_item: { badge_color: BadgeColor } | null;
          author: UserSummaryRow;
        }[],
        { merge: false }
      >();

    const candidates = new Map<string, UserSummaryRow>();
    for (const tile of tiles) {
      const badgeColor = tile.tile_item?.badge_color;
      if (
        tile.type === 'text' ||
        badgeColor === 'green' ||
        badgeColor === 'yellow'
      ) {
        candidates.set(tile.author.id, tile.author);
      }
    }

    if (candidates.size < PLAZA_MIN_CANDIDATES) return [];

    return this.sampleRandom([...candidates.values()], PLAZA_SAMPLE_SIZE).map(
      toFollowUserDto,
    );
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
}
