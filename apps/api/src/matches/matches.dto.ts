import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MATCH_QUEUES = [
  'COMPETITIVE',
  'UNRATED',
  'PREMIER',
  'SWIFTPLAY',
  'SPIKE_RUSH',
  'DEATHMATCH',
  'TEAM_DEATHMATCH',
  'CUSTOM',
  'OTHER',
] as const;
export const MATCH_RESULTS = [
  'WIN',
  'LOSS',
  'DRAW',
  'REMAKE',
  'UNKNOWN',
] as const;
export type MatchQueue = (typeof MATCH_QUEUES)[number];
export type MatchResultValue = (typeof MATCH_RESULTS)[number];

export class CreateMatchDto {
  @IsUUID() @IsOptional() sessionId?: string | null;
  @IsISO8601({ strict: true }) startedAt!: string;
  @IsIn(MATCH_QUEUES) queueType!: MatchQueue;
  @IsString()
  @Matches(/\S/, { message: 'agentName não pode ser vazio' })
  @MaxLength(80)
  agentName!: string;
  @IsString()
  @Matches(/\S/, { message: 'mapName não pode ser vazio' })
  @MaxLength(80)
  mapName!: string;
  @IsIn(MATCH_RESULTS) result!: MatchResultValue;
  @Type(() => Number) @IsInt() @Min(0) allyScore!: number;
  @Type(() => Number) @IsInt() @Min(0) enemyScore!: number;
  @Type(() => Number) @IsInt() @Min(-100) @Max(100) @IsOptional() rrChange?:
    number | null;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() kills?: number | null;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() deaths?: number | null;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() assists?: number | null;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() acs?: number | null;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  headshotPct?: number | null;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() firstKills?: number | null;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() firstDeaths?:
    number | null;
  @IsString() @MaxLength(2000) @IsOptional() notes?: string | null;
}

export class UpdateMatchDto extends PartialType(CreateMatchDto) {}

export class MatchListQueryDto {
  @IsUUID() @IsOptional() sessionId?: string;
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() pageSize = 20;
}

export class MatchSummaryDto {
  @ApiProperty({ example: 24 }) totalMatches!: number;
  @ApiProperty({ example: 8 }) linkedSessions!: number;
  @ApiProperty({ example: 13 }) wins!: number;
  @ApiProperty({ example: 9 }) losses!: number;
  @ApiProperty({ example: 2 }) draws!: number;
  @ApiProperty({ example: 54.2, nullable: true }) winRate!: number | null;
  @ApiProperty({ example: 86 }) totalRr!: number;
  @ApiProperty({ example: 4.1, nullable: true }) averageRr!: number | null;
  @ApiProperty({ example: 18.4, nullable: true }) averageKills!: number | null;
  @ApiProperty({ example: 15.2, nullable: true }) averageDeaths!: number | null;
  @ApiProperty({ example: 7.8, nullable: true }) averageAssists!: number | null;
  @ApiProperty({ example: 1.21, nullable: true }) kdRatio!: number | null;
  @ApiProperty({ example: 224.5, nullable: true }) averageAcs!: number | null;
  @ApiProperty({ example: 27.8, nullable: true }) averageHeadshotPct!:
    number | null;
  @ApiProperty({ example: 2.1, nullable: true }) averageFirstKills!:
    number | null;
  @ApiProperty({ example: 1.4, nullable: true }) averageFirstDeaths!:
    number | null;
  @ApiProperty({ example: 19 }) reflectionCount!: number;
  @ApiProperty({ example: 3.8, nullable: true }) averageDecisionClarity!:
    number | null;
  @ApiProperty({ example: 3.5, nullable: true }) averageCallResponse!:
    number | null;
  @ApiProperty({ example: 4.1, nullable: true }) averagePatternReading!:
    number | null;
}

export class UpsertReflectionDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) decisionClarity!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) callResponse!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) patternReading!: number;
  @Type(() => Number) @IsInt() @Min(0) freezesCount!: number;
  @Type(() => Number) @IsInt() @Min(0) taskConflictsCount!: number;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() delayedCallsCount = 0;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  communicatedIntentionsCount = 0;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() movementErrorsCount = 0;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() ecoPositioningErrorsCount =
    0;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  unnecessaryCrosshairMovesCount = 0;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() patternsRecognizedCount =
    0;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() adaptationsAppliedCount =
    0;
  @IsString() @MaxLength(1000) @IsOptional() goodDecision?: string | null;
  @IsString() @MaxLength(1000) @IsOptional() nextCorrection?: string | null;
}
