import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiRecommendationsService } from '../ai/ai-recommendations.service';
import { McpService } from '../mcp/mcp.service';
import { GoogleCalendarService } from './google-calendar.service';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly googleCalendar: GoogleCalendarService,
    private readonly ai: AiRecommendationsService,
    private readonly mcp: McpService,
  ) {}

  @Get('status')
  async status() {
    return {
      openai: this.ai.status(),
      googleCalendar: await this.googleCalendar.status(),
      mcp: this.mcp.status(),
    };
  }

  @Get('google-calendar/auth-url')
  authorizationUrl() {
    return this.googleCalendar.authorizationUrl();
  }

  @Get('google-calendar/callback')
  @Redirect()
  async callback(@Query('code') code: string, @Query('state') state: string) {
    return { url: await this.googleCalendar.callback(code, state) };
  }

  @Delete('google-calendar')
  disconnect() {
    return this.googleCalendar.disconnect();
  }

  @Post('google-calendar/sync/:weeklyPlanId')
  sync(@Param('weeklyPlanId') weeklyPlanId: string) {
    return this.googleCalendar.sync(weeklyPlanId);
  }
}
