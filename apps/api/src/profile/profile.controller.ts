import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiNotFoundResponse({
    description: 'Execute o seed para criar o perfil local.',
  })
  getProfile(): Promise<ProfileResponseDto> {
    return this.profileService.getLocalProfile();
  }

  @Put()
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Dados do perfil inconsistentes.' })
  @ApiNotFoundResponse({ description: 'Perfil local não encontrado.' })
  updateProfile(@Body() input: UpdateProfileDto): Promise<ProfileResponseDto> {
    return this.profileService.updateLocalProfile(input);
  }
}
