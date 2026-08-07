import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AI_COACH_PROVIDER, OpenAiCoachProvider } from './ai-coach.provider';
import { AiController } from './ai.controller';
import { AiRecommendationsService } from './ai-recommendations.service';

@Module({
  imports: [AuditModule, DashboardModule],
  controllers: [AiController],
  providers: [
    AiRecommendationsService,
    { provide: AI_COACH_PROVIDER, useClass: OpenAiCoachProvider },
  ],
  exports: [AiRecommendationsService],
})
export class AiModule {}
