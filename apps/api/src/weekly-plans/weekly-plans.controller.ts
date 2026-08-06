import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CancelBlockDto,
  CreateBlockDto,
  CreateWeeklyPlanDto,
  UpdateBlockDto,
  UpdateWeeklyPlanDto,
} from './weekly-plans.dto';
import { WeeklyPlansService } from './weekly-plans.service';
@Controller('weekly-plans')
export class WeeklyPlansController {
  constructor(private s: WeeklyPlansService) {}
  @Get() list() {
    return this.s.list();
  }
  @Post() create(@Body() d: CreateWeeklyPlanDto) {
    return this.s.create(d);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.s.get(id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() d: UpdateWeeklyPlanDto,
  ) {
    return this.s.update(id, d);
  }
  @Post(':id/confirm') confirm(@Param('id') id: string) {
    return this.s.confirm(id);
  }
  @Post(':id/close') close(@Param('id') id: string) {
    return this.s.close(id);
  }
  @Post(':id/blocks') block(
    @Param('id') id: string,
    @Body() d: CreateBlockDto,
  ) {
    return this.s.createBlock(id, d);
  }
}
@Controller('routine-blocks')
export class RoutineBlocksController {
  constructor(private s: WeeklyPlansService) {}
  @Patch(':id') update(@Param('id') id: string, @Body() d: UpdateBlockDto) {
    return this.s.updateBlock(id, d);
  }
  @Delete(':id') @HttpCode(204) delete(@Param('id') id: string) {
    return this.s.deleteBlock(id);
  }
  @Post(':id/cancel') cancel(
    @Param('id') id: string,
    @Body() d: CancelBlockDto,
  ) {
    return this.s.cancelBlock(id, d);
  }
}
