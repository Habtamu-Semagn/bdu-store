import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { ReleaseRequestsService } from '../release-requests/release-requests.service';
import { DeviceView } from './device.serializer';
import { DevicesService } from './devices.service';
import { DeviceRegistrationDto } from './dto/create-device.dto';

@ApiTags('devices')
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devices: DevicesService,
    private readonly releaseRequests: ReleaseRequestsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a device storage request (starts as PENDING).' })
  create(
    @Body() dto: DeviceRegistrationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeviceView> {
    return this.devices.create(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List the authenticated user’s own devices.' })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<DeviceView[]> {
    return this.devices.listMine(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one device (owner or administrator).' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeviceView> {
    return this.devices.getVisibleToUser(id, { id: user.id, role: user.role });
  }

  @Post(':id/release-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request release of one of your stored devices.' })
  createReleaseRequest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.releaseRequests.createForDevice(id, user.id);
  }
}
