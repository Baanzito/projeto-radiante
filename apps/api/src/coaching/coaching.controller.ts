import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ConvertFeedbackToFocusDto,
  CreateCoachFeedbackDto,
  CreateCoachSessionDto,
  UpdateCoachFeedbackDto,
  UpdateCoachSessionDto,
} from './coaching.dto';
import { CoachingService } from './coaching.service';

@Controller('coach-sessions')
export class CoachSessionsController {
  constructor(private readonly service: CoachingService) {}
  @Get() list() {
    return this.service.list();
  }
  @Post() create(@Body() input: CreateCoachSessionDto) {
    return this.service.create(input);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() input: UpdateCoachSessionDto,
  ) {
    return this.service.update(id, input);
  }
  @Post(':id/feedbacks') feedback(
    @Param('id') id: string,
    @Body() input: CreateCoachFeedbackDto,
  ) {
    return this.service.addFeedback(id, input);
  }
}

@Controller('coach-feedbacks')
export class CoachFeedbacksController {
  constructor(private readonly service: CoachingService) {}
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() input: UpdateCoachFeedbackDto,
  ) {
    return this.service.updateFeedback(id, input);
  }
  @Post(':id/convert-to-focus') convert(
    @Param('id') id: string,
    @Body() input: ConvertFeedbackToFocusDto,
  ) {
    return this.service.convertToFocus(id, input);
  }
}
