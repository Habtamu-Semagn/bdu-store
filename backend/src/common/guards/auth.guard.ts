import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT authentication guard. Passport validates the token (HttpOnly cookie or
 * `Authorization: Bearer`) and JwtStrategy attaches the verified user to the
 * request, which is what @CurrentUser() and the role guards read.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
