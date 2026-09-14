import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../common/auth/current-user-id.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import type { FollowUserDto } from './dto/follow-user.dto.js';
import { FollowsService } from './follows.service.js';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @UseGuards(SessionAuthGuard)
  @HttpCode(204)
  @Post(':id')
  follow(
    @Param('id') followeeId: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<void> {
    return this.followsService.follow(currentUserId, followeeId);
  }

  @UseGuards(SessionAuthGuard)
  @HttpCode(204)
  @Delete(':id')
  unfollow(
    @Param('id') followeeId: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<void> {
    return this.followsService.unfollow(currentUserId, followeeId);
  }

  @Get(':id/followers')
  listFollowers(@Param('id') id: string): Promise<FollowUserDto[]> {
    return this.followsService.listFollowers(id);
  }

  @Get(':id/following')
  listFollowing(@Param('id') id: string): Promise<FollowUserDto[]> {
    return this.followsService.listFollowing(id);
  }
}
