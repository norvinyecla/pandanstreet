import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import '../common/auth/session.types.js';
import { LoginDto } from './dto/login.dto.js';
import type { UserProfileDto } from './dto/user-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ): Promise<UserProfileDto> {
    const user = await this.usersService.findOrCreateByName(dto.name.trim());
    request.session.userId = user.id;
    return this.usersService.getProfile(user.id);
  }

  @HttpCode(204)
  @Post('logout')
  logout(@Req() request: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      request.session.destroy((err) => (err ? reject(err) : resolve()));
    });
  }

  @Get('me')
  async me(@Req() request: Request): Promise<UserProfileDto> {
    if (!request.session?.userId) {
      throw new UnauthorizedException('Not logged in');
    }
    return this.usersService.getProfile(request.session.userId);
  }
}
