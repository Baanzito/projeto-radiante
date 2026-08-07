import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditActor } from '../generated/prisma/enums';

export class AuditListQueryDto {
  @ApiPropertyOptional({ enum: AuditActor })
  @IsOptional()
  @IsEnum(AuditActor)
  actor?: AuditActor;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
