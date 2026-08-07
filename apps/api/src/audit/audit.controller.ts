import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditListQueryDto } from './audit.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit-events')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditListQueryDto) {
    return this.audit.list(query);
  }
}
