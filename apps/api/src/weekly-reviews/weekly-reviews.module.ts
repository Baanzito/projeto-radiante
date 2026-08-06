import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { WeeklyReviewsController } from './weekly-reviews.controller';
import { WeeklyReviewsService } from './weekly-reviews.service';

@Module({
  imports: [DashboardModule],
  controllers: [WeeklyReviewsController],
  providers: [WeeklyReviewsService],
})
export class WeeklyReviewsModule {}
