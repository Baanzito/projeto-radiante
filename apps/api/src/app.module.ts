import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { FocusAreasModule } from './focus-areas/focus-areas.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { TrainingCyclesModule } from './training-cycles/training-cycles.module';

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
  ],
})
export class AppModule {}
