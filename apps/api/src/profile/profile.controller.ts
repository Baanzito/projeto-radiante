import { Controller, Get } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ProfileResponseDto } from './dto/profile-response.dto';
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
}
