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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateFocusAreaDto } from './dto/create-focus-area.dto';
import { FocusAreaResponseDto } from './dto/focus-area-response.dto';
import { UpdateFocusAreaDto } from './dto/update-focus-area.dto';
import { FocusAreasService } from './focus-areas.service';

@ApiTags('focus-areas')
@Controller('focus-areas')
export class FocusAreasController {
  constructor(private readonly focusAreasService: FocusAreasService) {}

  @Get()
  @ApiOkResponse({ type: [FocusAreaResponseDto] })
  list(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<FocusAreaResponseDto[]> {
    return this.focusAreasService.list(includeInactive === 'true');
  }

  @Post()
  @ApiCreatedResponse({ type: FocusAreaResponseDto })
  @ApiConflictResponse({ description: 'Nome já utilizado.' })
  create(@Body() input: CreateFocusAreaDto): Promise<FocusAreaResponseDto> {
    return this.focusAreasService.create(input);
  }

  @Patch(':id')
  @ApiOkResponse({ type: FocusAreaResponseDto })
  @ApiNotFoundResponse({ description: 'Área de foco não encontrada.' })
  @ApiConflictResponse({ description: 'Nome já utilizado.' })
  update(
    @Param('id') id: string,
    @Body() input: UpdateFocusAreaDto,
  ): Promise<FocusAreaResponseDto> {
    return this.focusAreasService.update(id, input);
  }
}
