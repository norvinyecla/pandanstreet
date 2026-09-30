import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isUuid,
  toIsoString,
  type BadgeColor,
  type TileRow,
} from '../common/database/entities.js';
import { SUPABASE_CLIENT } from '../common/database/supabase.module.js';
import { UsersService } from '../users/users.service.js';
import type {
  BulletinItemDto,
  FeedAuthorDto,
  ShoutoutDto,
} from './dto/feed.dto.js';
import type { TileDto } from './dto/tile.dto.js';

const SHOUTOUTS_LIMIT = 20;
const BULLETIN_BOARD_LIMIT = 21;

const TILE_COLUMNS = 'id, user_id, type, created_at, archived';

interface TileTextRow {
  text: string;
}

interface TileItemRow {
  photo_url: string;
  caption: string;
  badge_color: BadgeColor;
}

interface AuthorRow {
  id: string;
  username: string;
  name: string;
  photo_url: string;
}

function toAuthorDto(row: AuthorRow): FeedAuthorDto {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    photoUrl: row.photo_url,
  };
}

@Injectable()
export class TilesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly db: SupabaseClient,
    private readonly usersService: UsersService,
  ) {}

  /** Creating a tile archives the author's oldest active tile when they're already at 3 (see `create_tile`). */
  async createText(userId: string, text: string): Promise<TileDto> {
    await this.ensureUserExists(userId);
    const tile = await this.createTile({
      p_user_id: userId,
      p_type: 'text',
      p_text: text,
    });
    return {
      id: tile.id,
      userId,
      type: 'text',
      createdAt: toIsoString(tile.created_at),
      text,
    };
  }

  async createItem(
    userId: string,
    photoUrl: string,
    caption: string,
    badgeColor: BadgeColor,
  ): Promise<TileDto> {
    await this.ensureUserExists(userId);
    const tile = await this.createTile({
      p_user_id: userId,
      p_type: 'item',
      p_photo_url: photoUrl,
      p_caption: caption,
      p_badge_color: badgeColor,
    });
    return {
      id: tile.id,
      userId,
      type: 'item',
      createdAt: toIsoString(tile.created_at),
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
    const tile = await this.findTile(tileId);
    if (!tile) throw new NotFoundException('Tile not found');
    if (tile.user_id !== userId) {
      throw new ForbiddenException("Cannot edit another user's tile");
    }
    if (tile.type !== 'text') {
      throw new BadRequestException('Only Text tiles can be edited');
    }

    await this.db
      .from('tile_text')
      .update({ text })
      .eq('tile_id', tileId)
      .throwOnError();

    return {
      id: tile.id,
      userId,
      type: 'text',
      createdAt: toIsoString(tile.created_at),
      text,
    };
  }

  /** Removes a tile from view by archiving it; the row is kept, per the data model rules. */
  async archive(tileId: string, userId: string): Promise<void> {
    const tile = await this.findTile(tileId);
    if (!tile || tile.archived) throw new NotFoundException('Tile not found');
    if (tile.user_id !== userId) {
      throw new ForbiddenException("Cannot delete another user's tile");
    }

    await this.db
      .from('tiles')
      .update({ archived: true })
      .eq('id', tileId)
      .throwOnError();
  }

  async getActiveTiles(userId: string): Promise<TileDto[]> {
    await this.ensureUserExists(userId);

    const { data } = await this.db
      .from('tiles')
      .select(
        `${TILE_COLUMNS}, tile_text(text), tile_item(photo_url, caption, badge_color)`,
      )
      .eq('user_id', userId)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .throwOnError()
      .overrideTypes<
        (TileRow & {
          tile_text: TileTextRow | null;
          tile_item: TileItemRow | null;
        })[],
        { merge: false }
      >();

    return data
      .map((tile): TileDto | undefined => {
        const createdAt = toIsoString(tile.created_at);
        if (tile.type === 'text') {
          if (!tile.tile_text) return undefined;
          return {
            id: tile.id,
            userId: tile.user_id,
            type: 'text',
            createdAt,
            text: tile.tile_text.text,
          };
        }
        if (!tile.tile_item) return undefined;
        return {
          id: tile.id,
          userId: tile.user_id,
          type: 'item',
          createdAt,
          photoUrl: tile.tile_item.photo_url,
          caption: tile.tile_item.caption,
          badgeColor: tile.tile_item.badge_color,
        };
      })
      .filter((dto): dto is TileDto => dto !== undefined);
  }

  /** Active Text tiles from profiles `userId` follows, most recent first, capped at 20. */
  async getShoutouts(userId: string): Promise<ShoutoutDto[]> {
    await this.ensureUserExists(userId);
    const followeeIds = await this.getFolloweeIds(userId);
    if (followeeIds.length === 0) return [];

    const { data } = await this.db
      .from('tiles')
      .select(
        'id, created_at, tile_text!inner(text), author:users(id, username, name, photo_url)',
      )
      .eq('type', 'text')
      .eq('archived', false)
      .in('user_id', followeeIds)
      .order('created_at', { ascending: false })
      .limit(SHOUTOUTS_LIMIT)
      .throwOnError()
      .overrideTypes<
        {
          id: string;
          created_at: string;
          tile_text: TileTextRow;
          author: AuthorRow;
        }[],
        { merge: false }
      >();

    return data.map((tile) => ({
      id: tile.id,
      createdAt: toIsoString(tile.created_at),
      text: tile.tile_text.text,
      author: toAuthorDto(tile.author),
    }));
  }

  /** Active Item tiles from profiles `userId` follows, most recent first, capped at 21. */
  async getBulletinBoard(userId: string): Promise<BulletinItemDto[]> {
    await this.ensureUserExists(userId);
    const followeeIds = await this.getFolloweeIds(userId);
    if (followeeIds.length === 0) return [];

    const { data } = await this.db
      .from('tiles')
      .select(
        'id, created_at, tile_item!inner(photo_url, caption, badge_color), author:users(id, username, name, photo_url)',
      )
      .eq('type', 'item')
      .eq('archived', false)
      .in('user_id', followeeIds)
      .order('created_at', { ascending: false })
      .limit(BULLETIN_BOARD_LIMIT)
      .throwOnError()
      .overrideTypes<
        {
          id: string;
          created_at: string;
          tile_item: TileItemRow;
          author: AuthorRow;
        }[],
        { merge: false }
      >();

    return data.map((tile) => ({
      id: tile.id,
      createdAt: toIsoString(tile.created_at),
      photoUrl: tile.tile_item.photo_url,
      caption: tile.tile_item.caption,
      badgeColor: tile.tile_item.badge_color,
      author: toAuthorDto(tile.author),
    }));
  }

  private async createTile(args: Record<string, string>): Promise<TileRow> {
    const { data } = await this.db
      .rpc('create_tile', args)
      .single<TileRow>()
      .throwOnError();
    return data;
  }

  private async findTile(tileId: string): Promise<TileRow | undefined> {
    if (!isUuid(tileId)) return undefined;
    const { data } = await this.db
      .from('tiles')
      .select(TILE_COLUMNS)
      .eq('id', tileId)
      .maybeSingle<TileRow>()
      .throwOnError();
    return data ?? undefined;
  }

  private async getFolloweeIds(userId: string): Promise<string[]> {
    const { data } = await this.db
      .from('follows')
      .select('followee_id')
      .eq('follower_id', userId)
      .throwOnError()
      .overrideTypes<{ followee_id: string }[], { merge: false }>();
    return data.map((follow) => follow.followee_id);
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
  }
}
