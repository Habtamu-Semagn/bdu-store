import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma.module';
import { DevicesModule } from './devices/devices.module';
import { HealthController } from './health/health.controller';
import { ReleaseRequestsModule } from './release-requests/release-requests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DevicesModule,
    ReleaseRequestsModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
