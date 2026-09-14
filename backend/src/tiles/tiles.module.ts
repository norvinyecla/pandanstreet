import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { TilesController } from './tiles.controller.js';
import { TilesService } from './tiles.service.js';

@Module({
  imports: [UsersModule],
  controllers: [TilesController],
  providers: [TilesService],
  exports: [TilesService],
})
export class TilesModule {}
