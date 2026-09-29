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
import { SignupDto } from './dto/signup.dto.js';
import type { UserProfileDto } from './dto/user-profile.dto.js';
import { UsersService } from './users.service.js';

/** Issues a fresh session id for `userId` to prevent session fixation. */
function startSession(request: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((err) => {
      if (err) return reject(err);
      request.session.userId = userId;
      resolve();
    });
  });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Req() request: Request,
  ): Promise<UserProfileDto> {
    const user = await this.usersService.signUp(
      dto.username,
      dto.name.trim(),
      dto.password,
    );
    await startSession(request, user.id);
    return this.usersService.getProfile(user.id);
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ): Promise<UserProfileDto> {
    const user = await this.usersService.authenticate(
      dto.username.trim().toLowerCase(),
      dto.password,
    );
    if (!user)
      throw new UnauthorizedException('Incorrect username or password');
    await startSession(request, user.id);
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
