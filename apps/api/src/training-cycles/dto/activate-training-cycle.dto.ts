import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ActivateTrainingCycleDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'Cancela explicitamente o ciclo ativo atual antes de ativar este.',
  })
  @IsOptional()
  @IsBoolean()
  replaceActive?: boolean = false;
}
