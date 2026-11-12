import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../guards/jwt-auth.guard';

/** 取当前登录用户（JwtAuthGuard 之后使用） */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest<Request>().user as JwtPayload;
  },
);
