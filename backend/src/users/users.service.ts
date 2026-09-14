import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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

  async findByName(name: string): Promise<UserRecord | undefined> {
    const users = await this.stores.users.readAll();
    return users.find((user) => user.name === name);
  }

  async create(name: string): Promise<UserRecord> {
    return this.stores.users.append({
      id: randomUUID(),
      name,
      photoUrl: '',
      createdAt: new Date().toISOString(),
    });
  }

  /** Finds the user with this name, or creates one (name-only login, no passwords). */
  async findOrCreateByName(name: string): Promise<UserRecord> {
    const existing = await this.findByName(name);
    if (existing) return existing;
    return this.create(name);
  }

  async setPhotoUrl(id: string, photoUrl: string): Promise<UserRecord> {
    const updated = await this.stores.users.update(
      (user) => user.id === id,
      (user) => ({ ...user, photoUrl }),
    );
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async getProfile(id: string): Promise<UserProfileDto> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    const follows = await this.stores.follows.readAll();
    const followerCount = follows.filter(
      (follow) => follow.followeeId === id,
    ).length;
    const followingCount = follows.filter(
      (follow) => follow.followerId === id,
    ).length;

    return {
      id: user.id,
      name: user.name,
      photoUrl: user.photoUrl,
      followerCount,
      followingCount,
    };
  }
}
