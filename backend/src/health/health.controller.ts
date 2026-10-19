import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe used by the frontend and the tests.' })
  check() {
    return {
      status: 'ok',
      service: 'bdu-store-api',
      timestamp: new Date().toISOString(),
    };
  }
}
