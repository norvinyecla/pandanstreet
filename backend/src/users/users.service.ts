import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hashPassword, verifyPassword } from '../common/auth/password.js';
import {
  isUniqueViolation,
  isUuid,
  toUserRecord,
  USER_COLUMNS,
  type UserRecord,
  type UserRow,
} from '../common/database/entities.js';
import { SUPABASE_CLIENT } from '../common/database/supabase.module.js';
import type { UserProfileDto } from './dto/user-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<UserRecord | undefined> {
    if (!isUuid(id)) return undefined;
    const { data } = await this.db
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', id)
      .maybeSingle<UserRow>()
      .throwOnError();
    return data ? toUserRecord(data) : undefined;
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const { data } = await this.db
      .from('users')
      .select(USER_COLUMNS)
      .eq('username', username)
      .maybeSingle<UserRow>()
      .throwOnError();
    return data ? toUserRecord(data) : undefined;
  }

  /** Creates a user; throws `ConflictException` if the username is taken. */
  async create(input: {
    username: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    try {
      const { data } = await this.db
        .from('users')
        .insert({
          username: input.username,
          name: input.name,
          password_hash: input.passwordHash,
        })
        .select(USER_COLUMNS)
        .single<UserRow>()
        .throwOnError();
      return toUserRecord(data);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Username is already taken');
      }
      throw err;
    }
  }

  async signUp(
    username: string,
    name: string,
    password: string,
  ): Promise<UserRecord> {
    const passwordHash = await hashPassword(password);
    return this.create({ username, name, passwordHash });
  }

  /** Returns the user if the username/password pair is valid. */
  async authenticate(
    username: string,
    password: string,
  ): Promise<UserRecord | undefined> {
    const user = await this.findByUsername(username);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return undefined;
    }
    return user;
  }

  /** Sets the user's photo and returns the path it replaced ('' if none). */
  async setPhotoUrl(
    id: string,
    photoUrl: string,
  ): Promise<{ user: UserRecord; previousPhotoUrl: string }> {
    if (!isUuid(id)) throw new NotFoundException('User not found');
    const { data: previousPhotoUrl } = await this.db
      .rpc('set_user_photo', { p_user_id: id, p_photo_url: photoUrl })
      .throwOnError();
    const user = await this.findById(id);
    if (typeof previousPhotoUrl !== 'string' || !user) {
      throw new NotFoundException('User not found');
    }
    return { user, previousPhotoUrl };
  }

  async setBio(id: string, bio: string): Promise<UserRecord> {
    if (!isUuid(id)) throw new NotFoundException('User not found');
    const { data } = await this.db
      .from('users')
      .update({ bio })
      .eq('id', id)
      .select(USER_COLUMNS)
      .maybeSingle<UserRow>()
      .throwOnError();
    if (!data) throw new NotFoundException('User not found');
    return toUserRecord(data);
  }

  async getProfile(id: string): Promise<UserProfileDto> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.toProfile(user);
  }

  /** Looks up a profile by username, ignoring case (usernames are stored lowercase). */
  async getProfileByUsername(username: string): Promise<UserProfileDto> {
    const user = await this.findByUsername(username.toLowerCase());
    if (!user) throw new NotFoundException('User not found');
    return this.toProfile(user);
  }

  private async toProfile(user: UserRecord): Promise<UserProfileDto> {
    const { id } = user;
    const [followers, following] = await Promise.all([
      this.db
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followee_id', id)
        .throwOnError(),
      this.db
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id)
        .throwOnError(),
    ]);

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      photoUrl: user.photoUrl,
      bio: user.bio,
      followerCount: followers.count ?? 0,
      followingCount: following.count ?? 0,
    };
  }
}
