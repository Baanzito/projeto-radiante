import { Module } from '@nestjs/common';
import {
  RoutineBlocksController,
  WeeklyPlansController,
} from './weekly-plans.controller';
import { WeeklyPlansService } from './weekly-plans.service';
@Module({
  controllers: [WeeklyPlansController, RoutineBlocksController],
  providers: [WeeklyPlansService],
})
export class WeeklyPlansModule {}
