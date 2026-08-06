import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { FOCUS_CATEGORIES } from './focus-area-response.dto';
import type { FocusCategoryValue } from './focus-area-response.dto';

export class CreateFocusAreaDto {
  @ApiProperty({ example: 'Controle de espaço', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: FOCUS_CATEGORIES, example: 'DECISION' })
  @IsIn(FOCUS_CATEGORIES)
  category!: FocusCategoryValue;

  @ApiProperty({
    example: 'Reavaliar o espaço do mapa antes de escolher a próxima ação.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  observableBehavior!: string;
}
