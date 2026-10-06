import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { createSessionMiddleware } from './common/auth/session-middleware.js';
import { SUPABASE_CLIENT } from './common/database/supabase.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(
    createSessionMiddleware(
      app.get(SUPABASE_CLIENT),
      process.env.SESSION_SECRET ?? 'pandanstreet-dev-secret',
    ),
  );
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
