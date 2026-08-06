import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CancelSessionDto,
  CompleteSessionDto,
  CreateSessionDto,
} from './training-sessions.dto';
import { TrainingSessionsService } from './training-sessions.service';
@Controller('sessions')
export class TrainingSessionsController {
  constructor(private s: TrainingSessionsService) {}
  @Get('active') active() {
    return this.s.active();
  }
  @Post() create(@Body() d: CreateSessionDto) {
    return this.s.create(d);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.s.get(id);
  }
  @Post(':id/pause') pause(@Param('id') id: string) {
    return this.s.pause(id);
  }
  @Post(':id/resume') resume(@Param('id') id: string) {
    return this.s.resume(id);
  }
  @Post(':id/complete') complete(
    @Param('id') id: string,
    @Body() d: CompleteSessionDto,
  ) {
    return this.s.complete(id, d);
  }
  @Post(':id/cancel') cancel(
    @Param('id') id: string,
    @Body() d: CancelSessionDto,
  ) {
    return this.s.cancel(id, d);
  }
}
