import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import {
  readSessionSettings,
  useSessions,
} from './common/auth/session-middleware.js';
import { SUPABASE_CLIENT } from './common/database/supabase.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  useSessions(app, app.get(SUPABASE_CLIENT), readSessionSettings(process.env));
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
