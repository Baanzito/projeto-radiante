import { Controller, Get, Query } from '@nestjs/common';
import { DashboardQueryDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get('summary') summary(@Query() query: DashboardQueryDto) {
    return this.service.summary(query.weekStart);
  }
}
