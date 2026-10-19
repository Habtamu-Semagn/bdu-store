import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { ROLE } from '../common/constants';
import { PublicUser, toPublicUser } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface LoginResult {
  user: PublicUser;
  token: string;
}

/**
 * A throwaway hash used to keep the login timing roughly constant whether or
 * not the university ID exists, so the endpoint does not leak which IDs
 * are registered.
 */
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash('bdu-store-timing-equaliser');
  return dummyHashPromise;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Registers a campus user. The university ID is stored exactly as entered so
   * the administrator can use whatever format the university issues.
   */
  async register(dto: RegisterDto): Promise<PublicUser> {
    const universityId = dto.universityId.trim();
    const fullName = dto.fullName.trim().replace(/\s+/g, ' ');

    const existingUniversityId = await this.users.findByUniversityId(universityId);
    if (existingUniversityId) {
      throw new ConflictException(
        'That university ID is already registered. Use a different ID or contact the store office.',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    try {
      const user = await this.users.create({
        fullName,
        universityId,
        passwordHash,
        role: ROLE.USER,
      });
      return toPublicUser(user);
    } catch (error) {
      // Two simultaneous registrations can slip past the checks above; the
      // unique indexes are the real guarantee.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'That university ID is already registered.',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const universityId = dto.universityId.trim();
    const user = await this.users.findByUniversityId(universityId);

    const hash = user?.passwordHash ?? (await dummyHash());
    const passwordMatches = await argon2
      .verify(hash, dto.password)
      .catch(() => false);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Incorrect university ID or password.');
    }

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });

    return { user: toPublicUser(user), token };
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Your account could not be found. Please log in again.');
    }
    return toPublicUser(user);
  }
}
