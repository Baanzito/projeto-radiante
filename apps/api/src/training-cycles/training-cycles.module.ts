import { Module } from '@nestjs/common';
import { TrainingCyclesController } from './training-cycles.controller';
import { TrainingCyclesService } from './training-cycles.service';

@Module({
  controllers: [TrainingCyclesController],
  providers: [TrainingCyclesService],
})
export class TrainingCyclesModule {}
