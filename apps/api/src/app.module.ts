import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { FocusAreasModule } from './focus-areas/focus-areas.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { TrainingCyclesModule } from './training-cycles/training-cycles.module';
import { TrainingSessionsModule } from './training-sessions/training-sessions.module';
import { WeeklyPlansModule } from './weekly-plans/weekly-plans.module';
import { MatchesModule } from './matches/matches.module';

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
  ],
})
export class AppModule {}
