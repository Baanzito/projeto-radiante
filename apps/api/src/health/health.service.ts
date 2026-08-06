import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponseDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        services: {
          api: 'up',
          database: 'up',
        },
        timestamp: new Date().toISOString(),
        version: '0.4.0',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        services: {
          api: 'up',
          database: 'down',
        },
        timestamp: new Date().toISOString(),
        version: '0.4.0',
      });
    }
  }
}
