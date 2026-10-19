import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user';
import { AdminGuard } from '../common/guards/admin.guard';
import { DeviceView } from '../devices/device.serializer';
import { AdminReleaseRequestView } from '../release-requests/release-request.serializer';
import { ReleaseRequestsService } from '../release-requests/release-requests.service';
import { AdminService } from './admin.service';
import { AdminStats, AdminStatsService } from './admin-stats.service';
import {
  ReleaseRequestQueryDto,
  RejectionReasonDto,
  StorageRequestQueryDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiCookieAuth('token')
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly releaseRequests: ReleaseRequestsService,
    private readonly stats: AdminStatsService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary:
      'Aggregate counts per product type and status, plus the queues awaiting a decision.',
  })
  getStats(): Promise<AdminStats> {
    return this.stats.getStats();
  }

  @Get('storage-requests')
  @ApiOperation({ summary: 'List storage requests, defaulting to PENDING.' })
  listStorageRequests(
    @Query() query: StorageRequestQueryDto,
  ): Promise<DeviceView[]> {
    return this.admin.listStorageRequests(query.status ?? 'PENDING');
  }

  @Get('devices/stored')
  @ApiOperation({ summary: 'List every device currently held in the store.' })
  listStoredDevices(): Promise<DeviceView[]> {
    return this.admin.listStoredDevices();
  }

  @Patch('devices/:id/approve-storage')
  @ApiOperation({
    summary: 'Approve storage, issuing a unique token and moving the device to STORED.',
  })
  approveStorage(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<DeviceView> {
    return this.admin.approveStorage(id, admin.id);
  }

  @Patch('devices/:id/reject-storage')
  @ApiOperation({ summary: 'Reject a storage request. A reason is required.' })
  rejectStorage(
    @Param('id') id: string,
    @Body() body: RejectionReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<DeviceView> {
    return this.admin.rejectStorage(id, admin.id, body.rejectionReason);
  }

  @Get('release-requests')
  @ApiOperation({ summary: 'List release requests, defaulting to PENDING.' })
  listReleaseRequests(
    @Query() query: ReleaseRequestQueryDto,
  ): Promise<AdminReleaseRequestView[]> {
    return this.admin.listReleaseRequests(query.status ?? 'PENDING');
  }

  @Patch('release-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a release request and mark the device RELEASED.' })
  approveRelease(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.releaseRequests.approve(id, admin.id);
  }

  @Patch('release-requests/:id/reject')
  @ApiOperation({
    summary: 'Reject a release request. The device stays STORED.',
  })
  rejectRelease(
    @Param('id') id: string,
    @Body() body: RejectionReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.releaseRequests.reject(id, admin.id, body.rejectionReason);
  }
}
