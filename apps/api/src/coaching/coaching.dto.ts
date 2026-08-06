import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { FOCUS_CATEGORIES } from '../focus-areas/dto/focus-area-response.dto';
import type { FocusCategoryValue } from '../focus-areas/dto/focus-area-response.dto';

export const FEEDBACK_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;
export const FEEDBACK_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'VALIDATED',
  'DISMISSED',
] as const;
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export class CreateCoachSessionDto {
  @IsString() @Matches(/\S/) @MaxLength(120) coachName!: string;
  @IsISO8601({ strict: true }) heldAt!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(720) durationMinutes!: number;
  @IsString() @Matches(/\S/) @MaxLength(4000) summary!: string;
}

export class UpdateCoachSessionDto extends PartialType(CreateCoachSessionDto) {}

export class CreateCoachFeedbackDto {
  @IsIn(FOCUS_CATEGORIES) category!: FocusCategoryValue;
  @IsIn(FEEDBACK_PRIORITIES) priority!: FeedbackPriority;
  @IsString() @Matches(/\S/) @MaxLength(3000) feedbackText!: string;
  @IsString() @MaxLength(3000) @IsOptional() evidence?: string | null;
  @IsString() @MaxLength(3000) @IsOptional() suggestedAction?: string | null;
  @IsUUID() @IsOptional() focusAreaId?: string | null;
}

export class UpdateCoachFeedbackDto extends PartialType(
  CreateCoachFeedbackDto,
) {
  @IsIn(FEEDBACK_STATUSES) @IsOptional() status?: FeedbackStatus;
}

export class ConvertFeedbackToFocusDto {
  @IsUUID() @IsOptional() focusAreaId?: string;

  @ValidateIf((value: ConvertFeedbackToFocusDto) => !value.focusAreaId)
  @IsString()
  @Matches(/\S/)
  @MaxLength(120)
  name?: string;

  @ValidateIf((value: ConvertFeedbackToFocusDto) => !value.focusAreaId)
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  observableBehavior?: string;
}
