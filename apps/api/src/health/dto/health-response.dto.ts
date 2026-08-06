import { ApiProperty } from '@nestjs/swagger';

class HealthServicesDto {
  @ApiProperty({ example: 'up', enum: ['up'] })
  api!: 'up';

  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  database!: 'up' | 'down';
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ type: HealthServicesDto })
  services!: HealthServicesDto;

  @ApiProperty({ example: '2026-08-06T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '0.5.0' })
  version!: string;
}
