import {
  All,
  Controller,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { PublicRoute } from '../auth/auth.constants';

@ApiExcludeController()
@PublicRoute()
@Controller('mcp')
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @All()
  async handle(@Req() request: Request, @Res() response: Response) {
    const authorization = request.header('authorization');
    if (!this.mcp.authorized(authorization)) throw new UnauthorizedException();
    await this.mcp.handle(request, response);
  }
}
