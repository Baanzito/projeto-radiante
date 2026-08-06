import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ActiveFocusDto {
  @ApiProperty({ example: 'Tomada de decisão rápida' })
  name!: string;

  @ApiProperty({ example: 'PRIMARY', enum: ['PRIMARY', 'SECONDARY'] })
  priority!: 'PRIMARY' | 'SECONDARY';

  @ApiProperty({
    example: 'Reduzir travamentos e manter clareza de decisão média de 4.',
  })
  successCriteria!: string;
}

class ActiveCycleDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222222' })
  id!: string;

  @ApiProperty({ example: 'Decisão e resposta às calls — 14 dias' })
  name!: string;

  @ApiProperty({ example: '2026-08-06' })
  startDate!: string;

  @ApiProperty({ example: '2026-08-19' })
  endDate!: string;

  @ApiProperty({ type: [ActiveFocusDto] })
  focuses!: ActiveFocusDto[];
}

export class ProfileResponseDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  id!: string;

  @ApiProperty({ example: 'Diego' })
  displayName!: string;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ example: 'Ascendente 2' })
  currentRank!: string;

  @ApiPropertyOptional({ example: 42, nullable: true })
  currentRr!: number | null;

  @ApiPropertyOptional({ example: 'Imortal 1', nullable: true })
  peakRank!: string | null;

  @ApiPropertyOptional({ example: 'Baanzito', nullable: true })
  valorantName!: string | null;

  @ApiPropertyOptional({ example: 'BR1', nullable: true })
  valorantTag!: string | null;

  @ApiProperty({ example: 0.179 })
  sensitivity!: number;

  @ApiProperty({ example: 3200 })
  dpi!: number;

  @ApiProperty({ example: 10 })
  weeklyRankedMin!: number;

  @ApiProperty({ example: 14 })
  weeklyRankedMax!: number;

  @ApiProperty({
    example:
      'Atingir Radiant e criar condições reais para competir profissionalmente.',
  })
  primaryGoal!: string;

  @ApiPropertyOptional({ example: '20:15', nullable: true })
  defaultSessionStart!: string | null;

  @ApiPropertyOptional({ example: '22:45', nullable: true })
  defaultSessionEnd!: string | null;

  @ApiPropertyOptional({ type: ActiveCycleDto, nullable: true })
  activeCycle!: ActiveCycleDto | null;
}
