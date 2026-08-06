import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CYCLE_CONCLUSIONS } from './training-cycle-response.dto';
import type { CycleConclusionValue } from './training-cycle-response.dto';

export class CompleteTrainingCycleDto {
  @ApiProperty({ enum: CYCLE_CONCLUSIONS, example: 'IMPROVED' })
  @IsIn(CYCLE_CONCLUSIONS)
  conclusion!: CycleConclusionValue;

  @ApiPropertyOptional({
    example: 'As decisões ficaram mais rápidas nas execuções coordenadas.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  conclusionNotes?: string | null;
}
