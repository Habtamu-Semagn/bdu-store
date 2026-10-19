import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export interface CreateUserData {
  fullName: string;
  universityId: string;
  passwordHash: string;
  role?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByUniversityId(universityId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { universityId } });
  }
}
