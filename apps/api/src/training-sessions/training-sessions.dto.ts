import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BLOCK_TYPES } from '../weekly-plans/weekly-plans.dto';
import type { BlockType } from '../weekly-plans/weekly-plans.dto';
export class CreateSessionDto {
  @IsUUID() @IsOptional() plannedBlockId?: string;
  @IsIn(BLOCK_TYPES) @IsOptional() type?: BlockType;
  @IsUUID() @IsOptional() focusAreaId?: string | null;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) @IsOptional() preEnergy?: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) @IsOptional() preFocus?: number;
}
export class CompleteSessionDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) overallConcentration!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) focusAdherence!: number;
  @IsString() @MaxLength(2000) mainLearning!: string;
  @IsString() @MaxLength(2000) nextAdjustment!: string;
  @IsString() @MaxLength(2000) @IsOptional() mentalState?: string | null;
}
export class CancelSessionDto {
  @IsString() @MaxLength(2000) @IsOptional() reason?: string | null;
}
