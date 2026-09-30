import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SupabaseModule } from './common/database/supabase.module.js';
import { FollowsModule } from './follows/follows.module.js';
import { TilesModule } from './tiles/tiles.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    UsersModule,
    FollowsModule,
    TilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
