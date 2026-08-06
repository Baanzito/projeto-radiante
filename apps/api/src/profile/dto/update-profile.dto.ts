import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Diego', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName!: string;

  @ApiProperty({ example: 'America/Sao_Paulo', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  timezone!: string;

  @ApiProperty({ example: 'Ascendente 2', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  currentRank!: string;

  @ApiPropertyOptional({ example: 42, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentRr!: number | null;

  @ApiPropertyOptional({ example: 'Imortal 1', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  peakRank!: string | null;

  @ApiPropertyOptional({ example: 'Baanzito', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  valorantName!: string | null;

  @ApiPropertyOptional({ example: 'BR1', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  valorantTag!: string | null;

  @ApiProperty({ example: 0.179 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(10)
  sensitivity!: number;

  @ApiProperty({ example: 3200 })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(20000)
  dpi!: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  weeklyRankedMin!: number;

  @ApiProperty({ example: 14 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  weeklyRankedMax!: number;

  @ApiProperty({ example: 'Atingir Radiant e competir profissionalmente.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  primaryGoal!: string;

  @ApiPropertyOptional({ example: '20:15', nullable: true })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  defaultSessionStart!: string | null;

  @ApiPropertyOptional({ example: '22:45', nullable: true })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  defaultSessionEnd!: string | null;
}
