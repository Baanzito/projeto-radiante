import { ApiProperty } from '@nestjs/swagger';

export const FOCUS_CATEGORIES = [
  'DECISION',
  'COMMUNICATION',
  'AWARENESS',
  'MOVEMENT',
  'AIM',
  'POSITIONING',
  'MENTAL',
  'OTHER',
] as const;

export type FocusCategoryValue = (typeof FOCUS_CATEGORIES)[number];

export class FocusAreaResponseDto {
  @ApiProperty({ example: '30000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'Tomada de decisão rápida' })
  name!: string;

  @ApiProperty({ enum: FOCUS_CATEGORIES, example: 'DECISION' })
  category!: FocusCategoryValue;

  @ApiProperty({
    example: 'Escolher e executar a prioridade do round sem travar.',
  })
  observableBehavior!: string;

  @ApiProperty({ example: true })
  active!: boolean;
}
