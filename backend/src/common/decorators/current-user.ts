import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../constants';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  universityId: string;
  role: Role | string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The verified user attached to the request by JwtStrategy. Only usable on
 * endpoints protected by JwtAuthGuard or AdminGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
