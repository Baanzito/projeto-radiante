import { PartialType } from '@nestjs/swagger';
import { CreateTrainingCycleDto } from './create-training-cycle.dto';

export class UpdateTrainingCycleDto extends PartialType(
  CreateTrainingCycleDto,
) {}
