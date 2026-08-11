import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { McpService } from './mcp.service';

describe('McpService production access', () => {
  function service(token?: string) {
    return new McpService(
      new ConfigService({
        NODE_ENV: 'production',
        APP_ORIGIN: 'https://radiante.example',
        MCP_ACCESS_TOKEN: token,
      }),
      {} as PrismaService,
      {} as DashboardService,
      {} as AuditService,
    );
  }

  it('stays disabled and rejects anonymous access without a production token', () => {
    const mcp = service();
    expect(mcp.status()).toMatchObject({
      enabled: false,
      endpoint: 'https://radiante.example/api/v1/mcp',
      tokenConfigured: false,
    });
    expect(mcp.authorized()).toBe(false);
  });

  it('accepts only the configured bearer token', () => {
    const mcp = service('token-seguro');
    expect(mcp.status()).toMatchObject({
      enabled: true,
      tokenConfigured: true,
    });
    expect(mcp.authorized('Bearer token-seguro')).toBe(true);
    expect(mcp.authorized('Bearer outro-token')).toBe(false);
  });
});
