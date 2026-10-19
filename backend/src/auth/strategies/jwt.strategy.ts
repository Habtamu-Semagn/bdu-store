import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma.service';
import { toPublicUser, PublicUser } from '../../users/user.mapper';

/**
 * Reads the access token from the `token` HttpOnly cookie set at login, and
 * falls back to `Authorization: Bearer <token>` for API clients and tests.
 */
function tokenFromCookie(request: Request): string | null {
  const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.token ?? null;
}

export interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        tokenFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-only-insecure-secret',
    });
  }

  /**
   * The user is re-read from the database on every request, so a role change
   * or a deleted account takes effect immediately rather than at token expiry.
   */
  async validate(payload: JwtPayload): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Your session is no longer valid. Please log in again.');
    }
    return toPublicUser(user);
  }
}
