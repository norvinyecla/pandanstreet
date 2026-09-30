import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword, verifyPassword } from '../common/auth/password.js';
import { CSV_STORES } from '../common/csv/csv.module.js';
import type { CsvStores } from '../common/csv/csv-stores.js';
import type { UserRecord } from '../common/csv/entities.js';
import type { UserProfileDto } from './dto/user-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(@Inject(CSV_STORES) private readonly stores: CsvStores) {}

  async findById(id: string): Promise<UserRecord | undefined> {
    const users = await this.stores.users.readAll();
    return users.find((user) => user.id === id);
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const users = await this.stores.users.readAll();
    return users.find((user) => user.username === username);
  }

  /** Creates a user; throws `ConflictException` if the username is taken. */
  async create(input: {
    username: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    const created = await this.stores.users.appendUnless(
      (user) => user.username === input.username,
      {
        id: randomUUID(),
        ...input,
        photoUrl: '',
        bio: '',
        createdAt: new Date().toISOString(),
      },
    );
    if (!created) throw new ConflictException('Username is already taken');
    return created;
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
    let previousPhotoUrl = '';
    const updated = await this.stores.users.update(
      (user) => user.id === id,
      (user) => {
        previousPhotoUrl = user.photoUrl;
        return { ...user, photoUrl };
      },
    );
    if (!updated) throw new NotFoundException('User not found');
    return { user: updated, previousPhotoUrl };
  }

  async setBio(id: string, bio: string): Promise<UserRecord> {
    const updated = await this.stores.users.update(
      (user) => user.id === id,
      (user) => ({ ...user, bio }),
    );
    if (!updated) throw new NotFoundException('User not found');
    return updated;
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
    const follows = await this.stores.follows.readAll();
    const followerCount = follows.filter(
      (follow) => follow.followeeId === id,
    ).length;
    const followingCount = follows.filter(
      (follow) => follow.followerId === id,
    ).length;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      photoUrl: user.photoUrl,
      bio: user.bio,
      followerCount,
      followingCount,
    };
  }
}
