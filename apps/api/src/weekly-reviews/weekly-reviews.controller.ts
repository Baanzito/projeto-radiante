import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  GenerateWeeklyReviewDto,
  UpdateWeeklyReviewDto,
  WeeklyReviewListQueryDto,
} from './weekly-reviews.dto';
import { WeeklyReviewsService } from './weekly-reviews.service';

@Controller('weekly-reviews')
export class WeeklyReviewsController {
  constructor(private readonly service: WeeklyReviewsService) {}
  @Get() list(@Query() query: WeeklyReviewListQueryDto) {
    return this.service.list(query);
  }
  @Post() generate(@Body() input: GenerateWeeklyReviewDto) {
    return this.service.generate(input);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() input: UpdateWeeklyReviewDto,
  ) {
    return this.service.update(id, input);
  }
  @Post(':id/apply') apply(@Param('id') id: string) {
    return this.service.apply(id);
  }
}
