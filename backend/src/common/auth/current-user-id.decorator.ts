import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import './session.types.js';

/** Extracts `session.userId`; only meaningful behind `SessionAuthGuard`. */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.session?.userId;
  },
);
