import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PublicRoute } from './auth.constants';
import { AuthSessionResponseDto, LoginDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@PublicRoute()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('session')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AuthSessionResponseDto })
  session(@Req() request: Request) {
    return this.auth.status(request);
  }

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AuthSessionResponseDto })
  login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.login(input.email, input.password, request, response);
  }

  @Post('logout')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AuthSessionResponseDto })
  logout(@Res({ passthrough: true }) response: Response) {
    return this.auth.logout(response);
  }
}
