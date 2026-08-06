import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { FOCUS_PRIORITIES } from './training-cycle-response.dto';
import type { FocusPriorityValue } from './training-cycle-response.dto';

export class CycleFocusInputDto {
  @ApiProperty({ example: '30000000-0000-4000-8000-000000000001' })
  @IsUUID()
  focusAreaId!: string;

  @ApiProperty({ enum: FOCUS_PRIORITIES, example: 'PRIMARY' })
  @IsIn(FOCUS_PRIORITIES)
  priority!: FocusPriorityValue;

  @ApiProperty({
    example: 'Reduzir travamentos para no máximo um por partida.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  successCriteria!: string;
}

export class CreateTrainingCycleDto {
  @ApiProperty({ example: 'Decisão e resposta às calls — 14 dias' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: '2026-08-06', pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiProperty({ enum: [7, 14, 30], example: 14 })
  @Type(() => Number)
  @IsIn([7, 14, 30])
  durationDays!: 7 | 14 | 30;

  @ApiProperty({ type: [CycleFocusInputDto], minItems: 1, maxItems: 3 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CycleFocusInputDto)
  focuses!: CycleFocusInputDto[];
}
