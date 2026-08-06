import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CreateMatchDto,
  MatchListQueryDto,
  UpdateMatchDto,
  UpsertReflectionDto,
} from './matches.dto';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly service: MatchesService) {}
  @Get() list(@Query() query: MatchListQueryDto) {
    return this.service.list(query);
  }
  @Post() create(@Body() input: CreateMatchDto) {
    return this.service.create(input);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() input: UpdateMatchDto) {
    return this.service.update(id, input);
  }
  @Get(':id/reflection') reflection(@Param('id') id: string) {
    return this.service.getReflection(id);
  }
  @Put(':id/reflection') upsertReflection(
    @Param('id') id: string,
    @Body() input: UpsertReflectionDto,
  ) {
    return this.service.upsertReflection(id, input);
  }
}

@Controller('reflections')
export class ReflectionsController {
  constructor(private readonly service: MatchesService) {}
  @Get('pending') pending() {
    return this.service.pending();
  }
}
