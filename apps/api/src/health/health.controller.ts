import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';
import { PublicRoute } from '../auth/auth.constants';

@ApiTags('system')
@PublicRoute()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({
    description: 'Banco de dados indisponível.',
  })
  check(): Promise<HealthResponseDto> {
    return this.healthService.check();
  }
}
