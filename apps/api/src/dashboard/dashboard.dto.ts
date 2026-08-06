import { IsDateString, IsOptional } from 'class-validator';

export class DashboardQueryDto {
  @IsDateString() @IsOptional() weekStart?: string;
}
