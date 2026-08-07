import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoachingModule } from './coaching/coaching.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DataExportsModule } from './data-exports/data-exports.module';
import { HealthModule } from './health/health.module';
import { FocusAreasModule } from './focus-areas/focus-areas.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { TrainingCyclesModule } from './training-cycles/training-cycles.module';
import { TrainingSessionsModule } from './training-sessions/training-sessions.module';
import { WeeklyPlansModule } from './weekly-plans/weekly-plans.module';
import { WeeklyReviewsModule } from './weekly-reviews/weekly-reviews.module';
import { MatchesModule } from './matches/matches.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    ProfileModule,
    FocusAreasModule,
    TrainingCyclesModule,
    WeeklyPlansModule,
    TrainingSessionsModule,
    MatchesModule,
    CoachingModule,
    DashboardModule,
    WeeklyReviewsModule,
    DataExportsModule,
    AuditModule,
    AiModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
