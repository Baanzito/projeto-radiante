import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FOCUS_CATEGORIES } from './focus-area-response.dto';
import type { FocusCategoryValue } from './focus-area-response.dto';

export class UpdateFocusAreaDto {
  @ApiPropertyOptional({ example: 'Controle de espaço' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: FOCUS_CATEGORIES, example: 'AWARENESS' })
  @IsOptional()
  @IsIn(FOCUS_CATEGORIES)
  category?: FocusCategoryValue;

  @ApiPropertyOptional({
    example: 'Reavaliar o espaço antes de escolher a próxima ação.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  observableBehavior?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
