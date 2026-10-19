import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ROLE } from '../constants';

/**
 * Administrator guard. Runs the JWT strategy first, then enforces
 * `role === 'ADMIN'` from the verified authentication context. Never trust a
 * role supplied by the client.
 */
@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string; role?: string } | undefined;

    if (!user?.id) {
      throw new UnauthorizedException('Please log in to continue.');
    }
    if (user.role !== ROLE.ADMIN) {
      throw new ForbiddenException('Administrator access is required for this action.');
    }

    return true;
  }
}
