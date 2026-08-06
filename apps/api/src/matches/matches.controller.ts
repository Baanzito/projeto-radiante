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
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  CreateMatchDto,
  MatchListQueryDto,
  MatchSummaryDto,
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
  @Get('summary')
  @ApiOperation({
    summary: 'Resume resultados e médias do histórico de partidas',
  })
  @ApiOkResponse({ type: MatchSummaryDto })
  summary() {
    return this.service.summary();
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
