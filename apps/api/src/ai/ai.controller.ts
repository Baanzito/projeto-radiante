import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AiRecommendationsService } from './ai-recommendations.service';

class DecideRecommendationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly recommendations: AiRecommendationsService) {}

  @Get('status')
  status() {
    return this.recommendations.status();
  }

  @Get('recommendations')
  list() {
    return this.recommendations.list();
  }

  @Post('sessions/:id/summary')
  sessionSummary(@Param('id') id: string) {
    return this.recommendations.sessionSummary(id);
  }

  @Post('weekly-plans/:id/summary')
  weeklySummary(@Param('id') id: string) {
    return this.recommendations.weeklySummary(id);
  }

  @Post('weekly-plans/:id/proposal')
  weeklyProposal(@Param('id') id: string) {
    return this.recommendations.weeklyPlanProposal(id);
  }

  @Post('recommendations/:id/confirm')
  confirm(@Param('id') id: string, @Body() body: DecideRecommendationDto) {
    return this.recommendations.confirm(id, body.reason);
  }

  @Post('recommendations/:id/reject')
  reject(@Param('id') id: string, @Body() body: DecideRecommendationDto) {
    return this.recommendations.reject(id, body.reason);
  }
}
