import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CYCLE_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;
export const FOCUS_PRIORITIES = ['PRIMARY', 'SECONDARY'] as const;
export const CYCLE_CONCLUSIONS = [
  'IMPROVED',
  'UNCHANGED',
  'REGRESSED',
  'INCONCLUSIVE',
] as const;

export type CycleStatusValue = (typeof CYCLE_STATUSES)[number];
export type FocusPriorityValue = (typeof FOCUS_PRIORITIES)[number];
export type CycleConclusionValue = (typeof CYCLE_CONCLUSIONS)[number];

export class CycleFocusResponseDto {
  @ApiProperty({ example: '30000000-0000-4000-8000-000000000001' })
  focusAreaId!: string;

  @ApiProperty({ example: 'Tomada de decisão rápida' })
  name!: string;

  @ApiProperty({ enum: FOCUS_PRIORITIES, example: 'PRIMARY' })
  priority!: FocusPriorityValue;

  @ApiProperty({
    example: 'Reduzir travamentos para no máximo um por partida.',
  })
  successCriteria!: string;
}

export class TrainingCycleResponseDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222222' })
  id!: string;

  @ApiProperty({ example: 'Decisão e resposta às calls — 14 dias' })
  name!: string;

  @ApiProperty({ example: '2026-08-06' })
  startDate!: string;

  @ApiProperty({ example: '2026-08-19' })
  endDate!: string;

  @ApiProperty({ example: 14, enum: [7, 14, 30] })
  durationDays!: number;

  @ApiProperty({ enum: CYCLE_STATUSES, example: 'ACTIVE' })
  status!: CycleStatusValue;

  @ApiPropertyOptional({ enum: CYCLE_CONCLUSIONS, nullable: true })
  conclusion!: CycleConclusionValue | null;

  @ApiPropertyOptional({ nullable: true })
  conclusionNotes!: string | null;

  @ApiProperty({ type: [CycleFocusResponseDto] })
  focuses!: CycleFocusResponseDto[];
}
