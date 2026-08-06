import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const REVIEW_STATUSES = ['GENERATED', 'REVIEWED', 'APPLIED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export class GenerateWeeklyReviewDto {
  @IsUUID() weeklyPlanId!: string;
}

export class UpdateWeeklyReviewDto {
  @IsString() @MaxLength(5000) selfConclusion!: string;
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  repeatedPatterns!: string[];
  @IsString() @MaxLength(3000) @IsOptional() nextWeekProposal?: string | null;
}

export class WeeklyReviewListQueryDto {
  @Type(() => String)
  @IsIn(REVIEW_STATUSES)
  @IsOptional()
  status?: ReviewStatus;
}
