import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActivateTrainingCycleDto } from './dto/activate-training-cycle.dto';
import { CompleteTrainingCycleDto } from './dto/complete-training-cycle.dto';
import { CreateTrainingCycleDto } from './dto/create-training-cycle.dto';
import { TrainingCycleResponseDto } from './dto/training-cycle-response.dto';
import { UpdateTrainingCycleDto } from './dto/update-training-cycle.dto';
import { TrainingCyclesService } from './training-cycles.service';

@ApiTags('training-cycles')
@Controller('training-cycles')
export class TrainingCyclesController {
  constructor(private readonly trainingCyclesService: TrainingCyclesService) {}

  @Get()
  @ApiOkResponse({ type: [TrainingCycleResponseDto] })
  list(): Promise<TrainingCycleResponseDto[]> {
    return this.trainingCyclesService.list();
  }

  @Post()
  @ApiCreatedResponse({ type: TrainingCycleResponseDto })
  @ApiBadRequestResponse({ description: 'Focos ou duração inválidos.' })
  create(
    @Body() input: CreateTrainingCycleDto,
  ): Promise<TrainingCycleResponseDto> {
    return this.trainingCyclesService.create(input);
  }

  @Get(':id')
  @ApiOkResponse({ type: TrainingCycleResponseDto })
  @ApiNotFoundResponse({ description: 'Ciclo não encontrado.' })
  get(@Param('id') id: string): Promise<TrainingCycleResponseDto> {
    return this.trainingCyclesService.get(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TrainingCycleResponseDto })
  @ApiNotFoundResponse({ description: 'Ciclo não encontrado.' })
  @ApiConflictResponse({ description: 'Ciclo já encerrado.' })
  update(
    @Param('id') id: string,
    @Body() input: UpdateTrainingCycleDto,
  ): Promise<TrainingCycleResponseDto> {
    return this.trainingCyclesService.update(id, input);
  }

  @Post(':id/activate')
  @ApiOkResponse({ type: TrainingCycleResponseDto })
  @ApiConflictResponse({ description: 'Já existe outro ciclo ativo.' })
  activate(
    @Param('id') id: string,
    @Body() input: ActivateTrainingCycleDto,
  ): Promise<TrainingCycleResponseDto> {
    return this.trainingCyclesService.activate(id, input);
  }

  @Post(':id/complete')
  @ApiOkResponse({ type: TrainingCycleResponseDto })
  @ApiConflictResponse({ description: 'O ciclo não está ativo.' })
  complete(
    @Param('id') id: string,
    @Body() input: CompleteTrainingCycleDto,
  ): Promise<TrainingCycleResponseDto> {
    return this.trainingCyclesService.complete(id, input);
  }
}
