import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { McpModule } from '../mcp/mcp.module';
import { CredentialVaultService } from './credential-vault.service';
import { GoogleCalendarService } from './google-calendar.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [AiModule, AuditModule, McpModule],
  controllers: [IntegrationsController],
  providers: [CredentialVaultService, GoogleCalendarService],
})
export class IntegrationsModule {}
