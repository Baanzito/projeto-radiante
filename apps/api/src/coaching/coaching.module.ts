import { Module } from '@nestjs/common';
import {
  CoachFeedbacksController,
  CoachSessionsController,
} from './coaching.controller';
import { CoachingService } from './coaching.service';

@Module({
  controllers: [CoachSessionsController, CoachFeedbacksController],
  providers: [CoachingService],
  exports: [CoachingService],
})
export class CoachingModule {}
