import { Module } from '@nestjs/common';
import { ReleaseRequestsModule } from '../release-requests/release-requests.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminStatsService } from './admin-stats.service';

@Module({
  imports: [ReleaseRequestsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminStatsService],
  exports: [AdminService],
})
export class AdminModule {}
