import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BadRequestException,
  Body,
  Controller,
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
import { resolveUploadLimits } from '../users/upload.config.js';
import { CreateItemTileDto } from './dto/create-item-tile.dto.js';
import { CreateTextTileDto } from './dto/create-text-tile.dto.js';
import type { TileDto } from './dto/tile.dto.js';
import { UpdateTextTileDto } from './dto/update-text-tile.dto.js';
import { TilesService } from './tiles.service.js';

@Controller('tiles')
export class TilesController {
  private readonly uploadDir: string;
  private readonly maxBytes: number;
  private readonly allowedTypes: Record<string, string>;

  constructor(
    private readonly tilesService: TilesService,
    config: ConfigService,
  ) {
    const dataDir = config.get<string>('DATA_DIR') ?? join(process.cwd(), 'data');
    this.uploadDir = join(dataDir, 'uploads');
    ({ maxBytes: this.maxBytes, allowedTypes: this.allowedTypes } =
      resolveUploadLimits(config));
  }

  @Get(':userId')
  getUserTiles(@Param('userId') userId: string): Promise<TileDto[]> {
    return this.tilesService.getActiveTiles(userId);
  }

  @UseGuards(SessionAuthGuard)
  @Post('text')
  createText(
    @CurrentUserId() userId: string,
    @Body() dto: CreateTextTileDto,
  ): Promise<TileDto> {
    return this.tilesService.createText(userId, dto.text);
  }

  @UseGuards(SessionAuthGuard)
  @Post('item')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  async createItem(
    @CurrentUserId() userId: string,
    @Body() dto: CreateItemTileDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<TileDto> {
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

    const filename = `${randomUUID()}.${extension}`;
    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(join(this.uploadDir, filename), file.buffer);

    return this.tilesService.createItem(
      userId,
      `/uploads/${filename}`,
      dto.caption,
      dto.badgeColor,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Patch(':id')
  editText(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateTextTileDto,
  ): Promise<TileDto> {
    return this.tilesService.editText(id, userId, dto.text);
  }
}
