import { Module } from '@nestjs/common';
import { ReleaseRequestsService } from './release-requests.service';

/**
 * Release-request decisions are exposed through the administrator controller
 * (AdminModule), which is why this module has no controller of its own.
 */
@Module({
  providers: [ReleaseRequestsService],
  exports: [ReleaseRequestsService],
})
export class ReleaseRequestsModule {}
