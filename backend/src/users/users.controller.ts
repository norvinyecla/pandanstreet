import { join } from 'node:path';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUserId } from '../common/auth/current-user-id.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { deletePhoto, savePhoto } from '../common/uploads/photo-files.js';
import { UpdateBioDto } from './dto/update-bio.dto.js';
import type { UserProfileDto } from './dto/user-profile.dto.js';
import { UsersService } from './users.service.js';
import { resolveUploadLimits } from './upload.config.js';

@Controller('users')
export class UsersController {
  private readonly uploadDir: string;
  private readonly maxBytes: number;
  private readonly allowedTypes: Record<string, string>;

  constructor(
    private readonly usersService: UsersService,
    config: ConfigService,
  ) {
    const dataDir =
      config.get<string>('DATA_DIR') ?? join(process.cwd(), 'data');
    this.uploadDir = join(dataDir, 'uploads');
    ({ maxBytes: this.maxBytes, allowedTypes: this.allowedTypes } =
      resolveUploadLimits(config));
  }

  @Get(':id')
  getProfile(@Param('id') id: string): Promise<UserProfileDto> {
    return this.usersService.getProfile(id);
  }

  @UseGuards(SessionAuthGuard)
  @Patch(':id/bio')
  async updateBio(
    @Param('id') id: string,
    @CurrentUserId() currentUserId: string,
    @Body() dto: UpdateBioDto,
  ): Promise<UserProfileDto> {
    if (currentUserId !== id) {
      throw new ForbiddenException("Cannot edit another user's bio");
    }
    await this.usersService.setBio(id, dto.bio);
    return this.usersService.getProfile(id);
  }

  @UseGuards(SessionAuthGuard)
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  async uploadPhoto(
    @Param('id') id: string,
    @CurrentUserId() currentUserId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UserProfileDto> {
    if (currentUserId !== id) {
      throw new ForbiddenException("Cannot edit another user's photo");
    }
    if (!file) {
      throw new BadRequestException('No photo file was provided');
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException(
        `Photo exceeds the ${Math.floor(this.maxBytes / (1024 * 1024))}MB limit`,
      );
    }
    const extension = this.allowedTypes[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Photo must be one of: jpg, png, webp');
    }

    const photoUrl = await savePhoto(this.uploadDir, file.buffer, extension);
    let previousPhotoUrl: string;
    try {
      ({ previousPhotoUrl } = await this.usersService.setPhotoUrl(
        id,
        photoUrl,
      ));
    } catch (err) {
      await deletePhoto(this.uploadDir, photoUrl);
      throw err;
    }
    await deletePhoto(this.uploadDir, previousPhotoUrl);
    return this.usersService.getProfile(id);
  }
}
