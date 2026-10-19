import { Module } from '@nestjs/common';
import { ReleaseRequestsModule } from '../release-requests/release-requests.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [ReleaseRequestsModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
