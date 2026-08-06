import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export const BLOCK_TYPES = [
  'RANKED',
  'AIM_TRAINING',
  'VOD_REVIEW',
  'COACHING',
  'COMPETITIVE',
  'THEORY',
  'FREE',
  'COMMITMENT',
  'OTHER',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export class CreateWeeklyPlanDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) weekStart!: string;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  rankedTargetMin?: number;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  rankedTargetMax?: number;
  @IsString() @MaxLength(2000) @IsOptional() weeklyIntent?: string;
}
export class UpdateWeeklyPlanDto extends PartialType(CreateWeeklyPlanDto) {}
export class CreateBlockDto {
  @IsIn(BLOCK_TYPES) type!: BlockType;
  @IsString() @IsNotEmpty() @MaxLength(160) title!: string;
  @IsISO8601({ strict: true }) plannedStart!: string;
  @IsISO8601({ strict: true }) plannedEnd!: string;
  @IsUUID() @IsOptional() focusAreaId?: string | null;
  @IsString() @MaxLength(2000) @IsOptional() notes?: string | null;
}
export class UpdateBlockDto extends PartialType(CreateBlockDto) {}
export class CancelBlockDto {
  @IsString() @MaxLength(2000) @IsOptional() reason?: string | null;
}
